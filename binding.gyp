{  # noqa: B018 # type: ignore
    # FIXME: Android need android_ndk_path
    # https://github.com/nodejs/gyp-next/issues/237
    "variables": {"android_ndk_path": ""},
    "targets": [
        {
            "target_name": "rime_cli",
            "type": "executable",
            "sources": [
                "rime-cli.c",
            ],
            "defines": [
                "PROJECT_NAME=\"<!(node -p \"require('./package.json').name\")\"",
                "PROJECT_VERSION=\"<!(node -p \"require('./package.json').version\")\"",
             ],
            "cflags": [
                "<!@(pkg-config --cflags rime json-c)",
            ],
            "ldflags": [
                "<!@(pkg-config --libs rime json-c)",
            ]
        }
    ]
}
