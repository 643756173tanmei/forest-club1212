#!/bin/zsh
cd "${0:A:h}" || exit 1
FOREST_NODE=$(command -v node)
if [[ -z "$FOREST_NODE" ]]; then
  FOREST_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$FOREST_NODE" ]]; then
  echo '请先安装 Node.js 24，再重新启动。'
  read -k 1 '?按任意键退出'
  exit 1
fi
if [[ ! -d node_modules || ! -f dist/index.html ]]; then
  echo '请按 README 的说明安装依赖并构建项目。'
  read -k 1 '?按任意键退出'
  exit 1
fi
"$FOREST_NODE" apps/api/src/server.mjs --production
