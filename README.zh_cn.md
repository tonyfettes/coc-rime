# coc-rime

Rime 输入法的 coc.nvim 集成

![截图](https://user-images.githubusercontent.com/29998228/111900984-6c20ef00-8a70-11eb-9920-4d9da5102a48.gif)

## 写在前面

这个插件还不是很成熟，并不能提供完整的中文语言支持。它被创造出来主要是为了在代码中写中文标识符，或者在不需要输入全角标点的中英文混合环境中快速输入中文。如果你使用 [fcitx](https://github.com/fcitx/fcitx) 并且希望能够在 vim 中获得相对完整的中文输入的支持，你可能会对 [fcitx.vim](https://github.com/lilydjwg/fcitx.vim) 感兴趣。

这个项目依赖的 [rime-cli](https://github.com/tonyfettes/rime-cli) 尚未提供对 Win 和 Mac 的支持，所以本插件目前只能在 64 位 Linux 环境下运行。因为这个插件是 Rime 输入法的集成，所以您需要先在您的系统中安装 [`librime`](https://github.com/rime/librime) 依赖。

## 使用方法

首先需要一个安装了 `librime` 的 64 位 Linux 系统。

在 neovim/vim 中运行

```vim
:CocInstall coc-rime
```

然后等待安装过程完成。

你可以通过 CocList 来切换至不同的 rime schema 。运行

```vim
:CocList rime_schema
```

然后选择你想要选择的 schema 即可。

## 可以使用的命令

1. `rime.enable`: 临时启用这个补全。
2. `rime.disable`: 临时关闭这个补全。
3. `rime.toggle`: 临时切换这个补全的开启/关闭状态。

## 可配置的选项

1. `rime.enabled`: 是否启用这个补全。
2. `rime.priority`: 这个补全源的优先级。
3. `rime.schemaId`: 插件加载时选择的 `schemaId`。
   某个 schema 对应的 `schemaId` 可以在 CocList `rime_schema` 中看到。
4. `rime.binaryPath`: `rime-cli` 二进制文件的位置。

## 开发计划

- [x] 基本输入法功能
- [x] 候选词优先级
- [x] 用户配置（补全来源优先级、补全项目数量等）
- [x] Schema 和 繁/简 通过 CocList 切换
- [x] global/workspace/folder 开启和关闭（大概）
- [ ] 全角符号输入

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
