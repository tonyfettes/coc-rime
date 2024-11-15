{  # noqa: B018 # type: ignore
    # FIXME: Android need android_ndk_path
    # https://github.com/nodejs/gyp-next/issues/237
    "variables": {"android_ndk_path": ""},
    "targets": [
        {
            "target_name": "rime",
            "sources": [
                "binding.c",
            ],
            "defines": [
                "RIME_API_VERSION=<!@(pkg-config --modversion rime|sed 's/\\.//g')"
            ],
            "cflags": [
                "<!@(pkg-config --cflags rime)",
            ],
            "ldflags": [
                "<!@(pkg-config --libs rime)",
            ],
            "conditions": [
                [
                    "OS == 'linux'",
                    {
                        # https://stackoverflow.com/questions/45135/why-does-the-order-in-which-libraries-are-linked-sometimes-cause-errors-in-gcc/29457226#29457226
                        # clang doesn't support it
                        # gcc of Ubuntu needs it
                        # gcc of ArchLinux ignores it
                        "ldflags+": ["-Wl,--start-group"]
                    },
                ]
            ],
        }
    ],
}