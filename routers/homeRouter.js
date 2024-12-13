import express from 'express'

const router = express.Router()

router.get('/', async (req, res) => {
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

router.all('/logout', (req, res) => {
    wechaty.logout()
    wechaty.reset()
    res.json({ code: 200, msg: '退出成功' })
})

export default router;
// export {router as homeRouter};