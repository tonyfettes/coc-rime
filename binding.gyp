{  # noqa: B018 # type: ignore
    # FIXME: Android need android_ndk_path
    # https://github.com/nodejs/gyp-next/issues/237
    "variables": {"android_ndk_path": ""},
    "targets": [
        {
            "target_name": "rime",
            "sources": [
                "binding.cc",
            ],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")"
                # gyp scan header files in macos
                "<!@(pkg-config --variable=includedir rime)",
            ],
            "defines": [
                "NAPI_DISABLE_CPP_EXCEPTIONS",
                "NODE_ADDON_API_DISABLE_DEPRECATED",
            ],
            "cflags": [
                "<!@(pkg-config --cflags rime)",
            ],
            "ldflags": [
                "<!@(pkg-config --libs rime)",
            ],
        }
    ],
}
