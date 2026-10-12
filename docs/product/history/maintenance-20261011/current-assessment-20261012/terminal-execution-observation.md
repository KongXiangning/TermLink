# 本轮终端/认证定向测试：Agent运行记录

性质：执行者转交的运行事实摘要；不是完整原始stdout归档，也不声称以下工具块在仓库内可打开。当前代码bb4849692fd600c3eb57866e28400fba612ee6aa。没有为补收据重跑测试。

- 首次9文件共53项：44通过、9因pty.node未构建而失败；当次工具块bfd5fe
- node-pty在项目内devdir重建后，受影响两文件使用timeout30s：5通过、8失败、2取消、exit124；工具块48371d、7263b8。8个WS失败包含旧sent.length=2断言面对当前5帧、teardown mock缺manager.sessions导致values undefined；SessionManager断言通过但进程不退出。未判产品功能坏
- sessions.web+terminal_shortcut_input：26/26，工具块dc27aa；仅grep结果行，无完整stdout
- health+shortcut：8/8，其中health2项；只保留结果行
- 后续8文件服务端定向：46/46，正常退出；只保留结果行，原始全stdout未另存
- 具体命令、原覆盖/样本/代码行与已知范围见每项评估及其source JSON；不同运行有重复文件，不把这些数量相加为唯一用例覆盖

元数据跨进程补验证由主执行者另外完成，metadata-roundtrip.cjs及metadata-result.log是实际保存的脚本与原始输出；其身份与本摘要分开。
