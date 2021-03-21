# coc-rime

Rime input method integration of coc.nvim

[中文 README](https://github.com/tonyfettes/coc-rime/blob/master/README.zh_cn.md)

![screenshot](https://user-images.githubusercontent.com/29998228/111900984-6c20ef00-8a70-11eb-9920-4d9da5102a48.gif)

## Prerequisite

A 64-bit Linux system with `librime` installed.
Mac and Windows are not supported yet.

## Install

Open your vim with `coc.nvim` plugin installed, and run

```vim
:CocInstall coc-rime
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
4. `rime.binaryPath`: The path where binary of `coc-rime` is placed.

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
