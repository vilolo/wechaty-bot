import { WechatyBuilder } from 'wechaty'
import { FileBox } from 'file-box'
import express from 'express'
import path from 'path'
import QRCode from 'qrcode'
import fs from 'fs'
import open from 'open'

var qrText = ''
var loginStatus = 0  //0=未登录 1=已登录
var userName = ''
var config = {}
const wechaty = WechatyBuilder.build() // get a Wechaty instance
const port = 3000
const url = "http://localhost:" + port

//wechaty服务
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
      // console.error('不支持错误', error)
    })
  wechaty.start()
}

//web服务
function expressService() {
  const app = express()
  app.set('views', path.resolve('views'))
  app.set('view engine', 'ejs')

  app.get('/', async (req, res) => {
    if (qrText) {
      try {
        var qrCodeUrl = await QRCode.toDataURL(qrText)
      } catch (err) {
        console.error(err)
        return res.status(500).send('生成二维码失败')
      }
    }

    res.render('index', { userName, loginStatus, qrCodeUrl }, (err, html) => {
      if (err) {
        console.error(err)
        res.status(500).send('内部服务器错误')
      } else {
        res.send(html)
      }
    })
  })

  app.all('/logout', (req, res) => {
    wechaty.logout()
    wechaty.reset()
    res.json({ code: 200, msg: '退出成功' })
  })

  console.log('浏览器打开：' + url)
  app.listen(port)
}

function readConfig() {
  try {
    const data = fs.readFileSync('config.json', 'utf8') // 同步读取文件
    config = JSON.parse(data)
  } catch (err) {
    console.log('json文件报错', err)
  }
}

//回复消息
function responseMsg(message) {
  const fromMsg = message.text()
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
      const regex = new RegExp(key, 'i')
      if (regex.test(fromMsg)) {
        console.log('回复：', key, rules[key])
        const type = rules[key].type
        const content = rules[key].content
        if (type && content) {
          isSend = true
          if (type == "text") {
            message.say(content)
          } else if (type == "image") {
            const fileBox = FileBox.fromUrl(content)
            message.say(fileBox)
          }
        } else {
          console.log('配置有误')
        }
        break
      }
    }
    if (!isSend) {
      const type = config.default.type
      const content = config.default.content
      if (type && content) {
        if (type == "text") {
          message.say(content)
        } else if (type == "image") {
          const fileBox = FileBox.fromUrl(content)
          message.say(fileBox)
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

open(url).then(() => {
  console.log('网页已在默认浏览器中打开')
}).catch(err => {
  console.error('请手动打开，打开网页时出错:', err)
})