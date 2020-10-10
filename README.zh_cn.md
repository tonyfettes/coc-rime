# coc-rime

Rime 输入法的 coc.nvim 集成

![截图](https://user-images.githubusercontent.com/29998228/95216680-f1974680-0824-11eb-94cb-83a8d9a5b59d.gif)

## 使用方法

先安装 [`rime-cli`](https://github.com/tonyfettes/rime-cli) 至 `/usr/bin/rime-cli`,
然后安装本插件，步骤如下：

1. 先 clone 本仓库至某文件夹
2. 将本仓库所在的文件夹加入 nvim 的 runtimepath 中

尝试在 vim 中直接输入拼音，coc 框架就会尝试补全相应的词组。

你也可以通过 coc list 来切换 schema, 输入

```vim
:CocList rime_schema
```

然后选择你想要选择的 schema 即可。

## 开发计划

- [x] 基本输入法功能
- [x] 候选词优先级
- [ ] 用户配置（补全来源优先级、补全项目数量等）
- [x] Schema 和 繁/简 通过 CocList 切换
- [ ] global/workspace/folder 开启和关闭

### 为什么想要开发这个插件

主要是因为 vim 里面切换输入法实在太麻烦了。
而且在代码里面输入中文的情况主要是输入中文标识符，
并不需要一个完整的中文语言支持。

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
