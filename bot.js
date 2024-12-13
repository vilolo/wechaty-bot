import { WechatyBuilder } from 'wechaty'
import { FileBox } from 'file-box'
import express from 'express'
import path from 'path'
import QRCode from 'qrcode'
import homeRouter from './routers/homeRouter.js'
import fs from 'fs'

var qrText = ''
var loginStatus = 0  //0=未登录 1=已登录
var userName = ''
var config = {}
const wechaty = WechatyBuilder.build() // get a Wechaty instance

// process.exit()

function wechatyService() {
  wechaty
    .on('scan', (qrcode, status) => {
      console.log(`Scan QR Code to login: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`)
      qrText = qrcode
      loginStatus = 0
      userName = ''
    })
    .on('login', user => {
      console.log(`User ${user} logged in`)
      userName = user
      qrText = ''
      loginStatus = 1
    })
    .on('message', message => {
      console.log(`Message: ${message}`)
      responseMsg(message)
    })
    .on('logout', user => {
      console.log(`user ${user} logout`)
    })
    .on('error', (error) => {
      console.error('刷新重新登录', error)
    })
  wechaty.start()
}

function expressService() {
  const app = express()
  app.set('views', path.resolve('views'))
  app.set('view engine', 'ejs');

  // app.use('/', homeRouter);

  app.get('/', async (req, res) => {
    if (qrText) {
      try {
        // 使用 async/await 获取二维码的 Data URL
        var qrCodeUrl = await QRCode.toDataURL(qrText);
      } catch (err) {
        console.error(err);
        return res.status(500).send('生成二维码失败');
      }
    }

    res.render('index', { userName, loginStatus, qrCodeUrl }, (err, html) => {
      if (err) {
        console.error(err);
        res.status(500).send('内部服务器错误');
      } else {
        res.send(html);
      }
    });
  });

  app.all('/logout', (req, res) => {
    wechaty.logout()
    wechaty.reset()
    res.json({ code: 200, msg: '退出成功' })
  })

  console.log('浏览器打开：http://localhost:3000/')
  app.listen(3000)
}

function readConfig() {
  try {
    const data = fs.readFileSync('config.json', 'utf8'); // 同步读取文件
    config = JSON.parse(data);
  } catch (err) {
    console.log('json文件报错', err)
  }
}

function responseMsg(fromMsg) {
  if (!fromMsg) {
    return
  }

  const rules = config.rules
  if (!rules) {
    console.log('配置有误')
    return
  }

  try {
    var isSend = false
    for (const key in rules) {
      const regex = new RegExp(key, 'i');
      if (regex.test(fromMsg)) {
        console.log('回复：', key, rules[key])
        const type = rules[key].type
        const content = rules[key].content
        if (type && content) {
          isSend = true
          if (type == "text") {
            wechaty.say(content)
          } else if (type == "image") {
            const fileBox = FileBox.fromUrl(content)
            wechaty.say(fileBox)
          }
        } else {
          console.log('配置有误')
        }
        break
      }
    }
    if (!isSend) {
      console.log('匹配不到',fromMsg)
      const type = config.default.type
      const content = config.default.content
      if (type && content) {
        if (type == "text") {
          wechaty.say(content)
        } else if (type == "image") {
          const fileBox = FileBox.fromUrl(content)
          wechaty.say(fileBox)
        }
      }
    }
  } catch (error) {
    console.log('回复报错：', error)
  }
}

readConfig()
setInterval(function () {
  readConfig()
}, 5000)

wechatyService()
expressService()