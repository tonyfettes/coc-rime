-- luacheck: ignore 113 143
---@diagnostic disable: undefined-global
---@diagnostic disable: undefined-field
add_rules("mode.debug", "mode.release")

add_requires("rime")

-- https://github.com/xmake-io/xmake/issues/5938
rule("nodejs.module")
do
    on_load(function(target)
        -- imports
        import("core.cache.detectcache")
        import("core.project.target", { alias = "project_target" })

        -- set kind
        if target:is_plat("macosx") then
            target:set("kind", "binary")
            target:add("ldflags", "-bundle", "-undefined dynamic_lookup", { force = true })
        else
            target:set("kind", "shared")
        end

        -- set library name
        local modulename = target:name():split('.', { plain = true })
        modulename = modulename[#modulename]
        target:set("filename", modulename .. ".node")

        -- export symbols
        if target:is_plat("windows") then
            local exported_name = target:name():gsub("%.", "_")
            exported_name = exported_name:match('^[^%-]+%-(.+)$') or exported_name
            target:add("shflags", "/export:napi_register_module_v1", { force = true })
        else
            target:set("symbols", "none")
        end

        -- https://github.com/nodejs/node-addon-api/issues/1021
        if is_plat("mingw") then
            import("core.project.config")
            local outputdir = config.get("buildir") .. "/node-api-stub"
            if not os.isdir(outputdir) then
                import("devel.git")
                git.clone("https://github.com/napi-bindings/node-api-stub", { depth = 1, outputdir = outputdir })
            end
            target:add("files", outputdir .. "/node_api.c")
        end

        -- add node library
        local has_node = false
        local includedirs = get_config("includedirs") -- pass node library from nodejs/xmake.lua
        if includedirs and includedirs:find("node-api-headers", 1, true) then
            has_node = true
        end
        if not has_node then
            -- user use `add_requires/add_packages` to add node package
            for _, pkg in ipairs(target:get("packages")) do
                if pkg == "node-api-headers" then
                    has_node = true
                    break
                end
            end
        end
        if not has_node then
            target:add(find_package("node-api-headers"))
        end
    end)
    on_install(function(target)
        if target:is_plat("macosx") then
            target:set("kind", "shared")
        end
        local moduledir = path.directory((target:name():gsub('%.', '/')))
        local installdir = "build/" .. get_config("mode")
        import("target.action.install")(target, {
            installdir = installdir,
            libdir = moduledir,
            bindir = path.join("lib", moduledir),
            includedir = path.join("include", moduledir)
        })
        if is_plat("mingw") then
            local modulename = target:name():split('.', { plain = true })
            modulename = modulename[#modulename]
            os.mv(installdir .. "/" .. modulename .. ".dll.a", installdir .. "/" .. modulename .. ".node")
        end
    end)
end

target("rime")
do
    set_languages("cxx17")
    add_rules("nodejs.module")
    add_packages("rime")
    add_includedirs("node_modules/node-addon-api", "node_modules/node-api-headers/include")
    add_files("*.cc")
end
