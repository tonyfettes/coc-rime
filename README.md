# coc-rime

[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/tonyfettes/coc-rime/master.svg)](https://results.pre-commit.ci/latest/github/tonyfettes/coc-rime/master)
[![github/workflow](https://github.com/tonyfettes/coc-rime/actions/workflows/main.yml/badge.svg)](https://github.com/tonyfettes/coc-rime/actions)

Rime input method integration of coc.nvim

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)

![screenshot](https://user-images.githubusercontent.com/29998228/111900984-6c20ef00-8a70-11eb-9920-4d9da5102a48.gif)

## Dependencies

- [rime](https://rime.im/)
- [pkg-config](http://pkg-config.freedesktop.org/)

```sh
# Ubuntu
sudo apt-get -y install pkg-config librime-dev librime1
# ArchLinux
sudo pacman -S pkg-config librime
# Android Termux
apt-get -y install pkg-config librime
# Nix
# without any extra operation
# Brew
brew tap tonyfettes/homebrew-rime
brew install pkg-config rime
```

## Install

- [coc-marketplace](https://github.com/fannheyward/coc-marketplace)
- [npm](https://www.npmjs.com/package/coc-rime)
- vim:

```vim
" command line
CocInstall coc-rime
" or add the following code to your vimrc
let g:coc_global_extensions = ['coc-rime', 'other coc-plugins']
```

## Commands

1. `rime.enable`: enable this source temporarily.
2. `rime.disable`: disable this source temporarily.
3. `rime.toggle`: temporarily toggle the status of the source.

## Lists

You could use `CocList` to switch between schema.

```vim
:CocList rime_schema
```

## User Configuration

1. `rime.enabled`: Whether to enable this source.
2. `rime.priority`: The priority of this completion source.
3. `rime.schemaId`: The `schemaId` selected when `coc-rime` start.
   You could get it from `rime_schema` list.
4. `rime.priority`: Priority of Rime completion source
5. `rime.traits.shared_data_dir`: Path(s) where rime data stores
6. `rime.traits.user_data_dir`: Path(s) where rime configuration stores
7. `rime.traits.*`: More rime traits

## License

MIT

## Related Projects

### IM for vim

- [fcitx.vim](https://github.com/lilydjwg/fcitx.vim): for [fcitx5](https://github.com/fcitx/fcitx5)
- [vim-xkbswitch](https://github.com/lyokha/vim-xkbswitch): for [ibus](https://github.com/ibus/ibus)
- [VimIM](https://github.com/vim-scripts/VimIM): Stop maintenance

本项目希望为不可能使用输入法的环境中提供必要的中文支持：

- 文本终端。例如在构建 Linux 时添加
  [cjktty-patches](https://github.com/zhmars/cjktty-patches)
  可以在文本终端显示中文，但在不使用 [fbterm](https://github.com/sfzhi/fbterm)
  时缺乏输入中文的方法。
- Android 。受限于 Android 权限机制，不可能在
  [termux](https://github.com/termux/termux-app) 中获取输入法 APP
  的状态以实现：
  - 退出插入模式时恢复英文输入模式
  - 进入插入模式时恢复上一次退出插入模式时的中、英文输入模式

### Rime frontends

See [here](https://github.com/osfans/trime/wiki/Rime%E5%89%8D%E7%AB%AF%E6%B1%87%E6%80%BB).
