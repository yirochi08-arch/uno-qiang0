# UNO 抢0

经典 UNO 加「抢0」：谁出了 0，全桌抢着拍，最慢的罚摸牌。可以和电脑玩，也可以开房间和朋友联机，空位由电脑补上。打开网页就能玩，不用注册登录。

- 游戏页：`index.html`（由 `build.py` 生成，单文件，字体和联机库都内嵌在里面）
- 源码：`src/page.html`
- 联机：经 EMQX 的免费公共 MQTT 服务器转发（国内线路优先，连不上换海外线路）。整局牌在房主的页面上运行，房主请一直开着页面。

改完 `src/page.html` 后运行：

```bash
python build.py
```

第三方：MQTT.js（MIT，`vendor/mqtt.LICENSE.md`），Rubik 字体（SIL OFL 1.1，`fonts/OFL.txt`）。
