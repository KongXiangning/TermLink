---
{
  "schema": "vnext-product-doc/v2",
  "items": [
    {
      "type": "goal",
      "id": "GOAL-TERMLINK-MOBILE-ACCESS",
      "scope": "current",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/PRODUCT_REQUIREMENTS.md",
          "sha256": "f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260222-session-retention-reconnect.md",
          "sha256": "1c388c67e07e743aad1ff54677d0ff60ef604f23f9cf1487407edc7fe357b32b"
        }
      ],
      "extensions": {
        "origin": "从既有定位/目标整理，非新增业务承诺"
      }
    },
    {
      "type": "goal",
      "id": "GOAL-TERMLINK-CODEX-CONTINUITY",
      "scope": "current",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/PRODUCT_REQUIREMENTS.md",
          "sha256": "f1c0dc2a8994bbc2a02f2d68c0c43ff9451a1a79f933d9350265f583481cd1fd"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md",
          "sha256": "3c6931a5a1f3a322053f84b99574ede430bfe9c9b520f26f3db955d760001dc3"
        },
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20261005-codex-history-save-repair.md",
          "sha256": "1f70555e698e229fbde42b99eae9bc5a3256bc30f48a019f6381d64f736168ba"
        }
      ],
      "extensions": {
        "origin": "从既有定位/目标整理，非新增业务承诺"
      }
    },
    {
      "type": "goal",
      "id": "GOAL-TERMLINK-RELAY-ACCESS",
      "scope": "planned",
      "sources": [
        {
          "kind": "file",
          "path": "docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md",
          "sha256": "8301ba332276f719e06b03977a442f0eddf39de846f11e5f339abacfdbde682b"
        }
      ],
      "extensions": {
        "origin": "从既有定位/目标整理，非新增业务承诺"
      }
    }
  ]
}
---
# TermLink 既有目标



## [GOAL-TERMLINK-MOBILE-ACCESS] 稳定的移动与浏览器远程终端访问

### 目标说明

保持终端输入/输出/resize、会话管理、断联续接、触控输入和Android/浏览器独立使用。

### 范围边界

目标结果的当前测量、时延阈值、适用设备群和成功率未记录；历史特性交付不等于目标达成。

### 依据与结果材料

[docs/product/PRODUCT_REQUIREMENTS.md](../../docs/product/PRODUCT_REQUIREMENTS.md)；[docs/product/requirements/REQ-20260222-session-retention-reconnect.md](../../docs/product/requirements/REQ-20260222-session-retention-reconnect.md)。本轮未执行目标效果测量。


## [GOAL-TERMLINK-CODEX-CONTINUITY] 移动Codex对话与同一会话连续性

### 目标说明

以对话体验为主，跟随同一conversation正文/运行态；真实历史保存、工具详情和恢复按各REQ范围验收。

### 范围边界

IPC authority和owner能力边界按AD-004；832三样本证据不覆盖全部设备、竞态、resend或长期稳定性。

### 依据与结果材料

[docs/product/PRODUCT_REQUIREMENTS.md](../../docs/product/PRODUCT_REQUIREMENTS.md)；[docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md](../../docs/product/requirements/REQ-20260516-codex-mobile-realtime-sync.md)；[docs/product/requirements/REQ-20261005-codex-history-save-repair.md](../../docs/product/requirements/REQ-20261005-codex-history-save-repair.md)。本轮未执行目标效果测量。


## [GOAL-TERMLINK-RELAY-ACCESS] 私网服务的受控透明访问

### 目标说明

让私网目标主机通过connector出站加入Relay，使App访问既有session API/terminal WS，保持目标TLS/mTLS身份。

### 范围边界

单组织单管理员+MFA；预创建app_client槽位+一次性注册码；排除workspace/codex/external web、TLS终止、SaaS/SSO/多管理员。未核验实际交付。

### 依据与结果材料

[docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md](../../docs/product/requirements/REQ-20260413-relay-control-plane-and-transparent-transit.md)。本轮未执行目标效果测量。
