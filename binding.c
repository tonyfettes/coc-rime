#include <node_api.h>
#if RIME_API_VERSION >= 1120
#include <rime_api_deprecated.h>
#else
#include <rime_api.h>
#endif
#include <stdio.h>

#define DEFAULT_BUFFER_SIZE 1024
#ifndef __STRING
#define __STRING(x) #x
#endif /* ifndef  */
#define STRING(x) __STRING(x)
#define NODE_API_CALL(env, call)                                               \
  do {                                                                         \
    napi_status status = (call);                                               \
    if (status != napi_ok) {                                                   \
      const napi_extended_error_info *error_info = NULL;                       \
      napi_get_last_error_info((env), &error_info);                            \
      const char *err_message = error_info->error_message;                     \
      bool is_pending;                                                         \
      napi_is_exception_pending((env), &is_pending);                           \
      /* If an exception is already pending, don't rethrow it */               \
      if (!is_pending) {                                                       \
        const char *message =                                                  \
            (err_message == NULL) ? "empty error message" : err_message;       \
        napi_throw_error((env), NULL, message);                                \
      }                                                                        \
      return NULL;                                                             \
    }                                                                          \
  } while (0)
#define SET_ARGV(env, argv)                                                    \
  do {                                                                         \
    size_t argc = sizeof(argv) / sizeof((argv)[0]);                            \
    size_t original_argc = argc;                                               \
    NODE_API_CALL(env,                                                         \
                  napi_get_cb_info((env), info, &argc, (argv), NULL, NULL));   \
    if (argc < original_argc) {                                                \
      char str[DEFAULT_BUFFER_SIZE];                                           \
      sprintf(str, "need %zd arguments, only get %zd arguments",               \
              original_argc, argc);                                            \
      napi_throw_error((env), NULL, str);                                      \
      return NULL;                                                             \
    }                                                                          \
  } while (0)
#define SET_SESSION_ID(env, value, session_id)                                 \
  do {                                                                         \
    bool lossless;                                                             \
    NODE_API_CALL((env), napi_get_value_bigint_uint64(                         \
                             (env), (value), &(session_id), &lossless));       \
  } while (0);
#define SET_STRING(env, value, str)                                            \
  do {                                                                         \
    size_t size;                                                               \
    NODE_API_CALL((env),                                                       \
                  napi_get_value_string_utf8((env), (value), (str),            \
                                             DEFAULT_BUFFER_SIZE, &size));     \
    if (size == DEFAULT_BUFFER_SIZE) {                                         \
      napi_throw_error((env), NULL,                                            \
                       "path length is longer than buffer size " STRING(       \
                           DEFAULT_BUFFER_SIZE));                              \
      return NULL;                                                             \
    }                                                                          \
  } while (0)
#define SET_TRAITS(env, value, str, traits)                                    \
  do {                                                                         \
    bool is_ok;                                                                \
    NODE_API_CALL(env, napi_has_named_property(env, value, #str, &is_ok));     \
    if (is_ok) {                                                               \
      napi_value result;                                                       \
      NODE_API_CALL(env, napi_get_named_property(env, value, #str, &result));  \
      SET_STRING(env, result, str);                                            \
      traits.str = str;                                                        \
    }                                                                          \
  } while (0);

static napi_value init(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  SET_ARGV(env, argv);
  RIME_STRUCT(RimeTraits, rime_traits);
  char shared_data_dir[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], shared_data_dir, rime_traits);
  char user_data_dir[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], user_data_dir, rime_traits);
  char log_dir[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], log_dir, rime_traits);
  char distribution_name[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], distribution_name, rime_traits);
  char distribution_code_name[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], distribution_code_name, rime_traits);
  char distribution_version[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], distribution_version, rime_traits);
  char app_name[DEFAULT_BUFFER_SIZE];
  SET_TRAITS(env, argv[0], app_name, rime_traits);
  bool is_ok;
  NODE_API_CALL(env,
                napi_has_named_property(env, argv[0], "min_log_level", &is_ok));
  if (is_ok) {
    napi_value result;
    NODE_API_CALL(
        env, napi_get_named_property(env, argv[0], "min_log_level", &result));
    NODE_API_CALL(
        env, napi_get_value_int32(env, result, &rime_traits.min_log_level));
  }
  RimeSetup(&rime_traits);
  RimeInitialize(&rime_traits);
  return NULL;
}

static napi_value createSession(napi_env env, napi_callback_info info) {
  napi_value result;
  RimeSessionId session_id = RimeCreateSession();
  if (session_id == 0) {
    napi_throw_error(env, NULL, "rime cannot create session");
    return NULL;
  }
  NODE_API_CALL(env, napi_create_bigint_uint64(env, session_id, &result));
  return result;
}

static napi_value destroySession(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  RimeSessionId session_id;
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  if (!RimeDestroySession(session_id)) {
    char str[DEFAULT_BUFFER_SIZE];
    sprintf(str, "cannot destroy session %ld", session_id);
    napi_throw_error(env, NULL, str);
  }
  RimeFinalize();
  return NULL;
}

static napi_value getCurrentSchema(napi_env env, napi_callback_info info) {
  napi_value schema_id, argv[1];
  RimeSessionId session_id;
  char buffer[DEFAULT_BUFFER_SIZE];
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  if (!RimeGetCurrentSchema(session_id, buffer, DEFAULT_BUFFER_SIZE)) {
    napi_throw_error(env, NULL, "cannot get current schema");
    return NULL;
  }
  NODE_API_CALL(
      env, napi_create_string_utf8(env, buffer, NAPI_AUTO_LENGTH, &schema_id));
  return schema_id;
}

static napi_value getSchemaList(napi_env env, napi_callback_info info) {
  napi_value result;
  RimeSchemaList schema_list;
  if (!RimeGetSchemaList(&schema_list)) {
    napi_throw_error(env, NULL, "cannot get schema list");
    return NULL;
  }
  NODE_API_CALL(env,
                napi_create_array_with_length(env, schema_list.size, &result));
  for (size_t i = 0; i < schema_list.size; i++) {
    napi_value element, schema_id, name;
    RimeSchemaListItem schema_list_item = schema_list.list[i];
    NODE_API_CALL(env, napi_create_object(env, &element));
    NODE_API_CALL(env, napi_create_string_utf8(env, schema_list_item.schema_id,
                                               NAPI_AUTO_LENGTH, &schema_id));
    NODE_API_CALL(
        env, napi_set_named_property(env, element, "schema_id", schema_id));
    NODE_API_CALL(env, napi_create_string_utf8(env, schema_list_item.name,
                                               NAPI_AUTO_LENGTH, &name));
    NODE_API_CALL(env, napi_set_named_property(env, element, "name", name));
    NODE_API_CALL(env, napi_set_element(env, result, i, element));
  }
  RimeFreeSchemaList(&schema_list);
  return result;
}

static napi_value selectSchema(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  RimeSessionId session_id;
  char schema_id[DEFAULT_BUFFER_SIZE];
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  SET_STRING(env, argv[1], schema_id);
  if (!RimeSelectSchema(session_id, schema_id)) {
    char str[DEFAULT_BUFFER_SIZE + sizeof("cannot select schema ")];
    sprintf(str, "cannot select schema %s", schema_id);
    napi_throw_error(env, NULL, str);
  }
  return NULL;
}

static napi_value processKey(napi_env env, napi_callback_info info) {
  int keycode, mask;
  napi_value argv[3];
  RimeSessionId session_id;
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  NODE_API_CALL(env, napi_get_value_int32(env, argv[1], &keycode));
  NODE_API_CALL(env, napi_get_value_int32(env, argv[2], &mask));
  if (!RimeProcessKey(session_id, keycode, mask)) {
    char str[DEFAULT_BUFFER_SIZE];
    sprintf(str, "cannot process key %d", keycode);
    napi_throw_error(env, NULL, str);
  }
  return NULL;
}

static napi_value getContext(napi_env env, napi_callback_info info) {
  napi_value result, composition, menu, argv[1];
  RimeSessionId session_id;
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  RIME_STRUCT(RimeContext, context);
  if (!RimeGetContext(session_id, &context)) {
    napi_throw_error(env, NULL, "cannot get context");
    return NULL;
  }
  NODE_API_CALL(env, napi_create_object(env, &result));
  NODE_API_CALL(env, napi_create_object(env, &composition));
  NODE_API_CALL(
      env, napi_set_named_property(env, result, "composition", composition));
  NODE_API_CALL(env, napi_create_object(env, &menu));
  NODE_API_CALL(env, napi_set_named_property(env, result, "menu", menu));
  napi_value length, cursor_pos, sel_start, sel_end;
  NODE_API_CALL(env,
                napi_create_int64(env, context.composition.length, &length));
  NODE_API_CALL(env,
                napi_set_named_property(env, composition, "length", length));
  NODE_API_CALL(
      env, napi_create_int64(env, context.composition.cursor_pos, &cursor_pos));
  NODE_API_CALL(
      env, napi_set_named_property(env, composition, "cursor_pos", cursor_pos));
  NODE_API_CALL(
      env, napi_create_int64(env, context.composition.sel_start, &sel_start));
  NODE_API_CALL(
      env, napi_set_named_property(env, composition, "sel_start", sel_start));
  NODE_API_CALL(env,
                napi_create_int64(env, context.composition.sel_end, &sel_end));
  NODE_API_CALL(env,
                napi_set_named_property(env, composition, "sel_end", sel_end));
  if (context.composition.preedit) {
    napi_value preedit;
    NODE_API_CALL(env, napi_create_string_utf8(env, context.composition.preedit,
                                               NAPI_AUTO_LENGTH, &preedit));
    NODE_API_CALL(
        env, napi_set_named_property(env, composition, "preedit", preedit));
  }
  napi_value page_size, page_no, is_last_page, highlighted_candidate_index,
      num_candidates;
  NODE_API_CALL(env,
                napi_create_int64(env, context.menu.page_size, &page_size));
  NODE_API_CALL(env,
                napi_set_named_property(env, menu, "page_size", page_size));
  NODE_API_CALL(env, napi_create_int64(env, context.menu.page_no, &page_no));
  NODE_API_CALL(env, napi_set_named_property(env, menu, "page_no", page_no));
  NODE_API_CALL(
      env, napi_create_int64(env, context.menu.is_last_page, &is_last_page));
  NODE_API_CALL(
      env, napi_set_named_property(env, menu, "is_last_page", is_last_page));
  NODE_API_CALL(env,
                napi_create_int64(env, context.menu.highlighted_candidate_index,
                                  &highlighted_candidate_index));
  NODE_API_CALL(env, napi_set_named_property(env, menu,
                                             "highlighted_candidate_index",
                                             highlighted_candidate_index));
  NODE_API_CALL(env, napi_create_int64(env, context.menu.num_candidates,
                                       &num_candidates));
  NODE_API_CALL(env, napi_set_named_property(env, menu, "num_candidates",
                                             num_candidates));
  if (context.menu.candidates) {
    napi_value candidates;
    NODE_API_CALL(env, napi_create_array_with_length(
                           env, context.menu.num_candidates, &candidates));
    NODE_API_CALL(env,
                  napi_set_named_property(env, menu, "candidates", candidates));
    for (int i = 0; i < context.menu.num_candidates; i++) {
      napi_value candidate;
      NODE_API_CALL(env, napi_create_object(env, &candidate));
      NODE_API_CALL(env, napi_set_element(env, candidates, i, candidate));
      if (context.menu.candidates[i].text) {
        napi_value text;
        NODE_API_CALL(
            env, napi_create_string_utf8(env, context.menu.candidates[i].text,
                                         NAPI_AUTO_LENGTH, &text));
        NODE_API_CALL(env,
                      napi_set_named_property(env, candidate, "text", text));
      }
      if (context.menu.candidates[i].comment) {
        napi_value comment;
        NODE_API_CALL(env, napi_create_string_utf8(
                               env, context.menu.candidates[i].comment,
                               NAPI_AUTO_LENGTH, &comment));
        NODE_API_CALL(
            env, napi_set_named_property(env, candidate, "comment", comment));
      }
    }
  }
  if (context.menu.select_keys) {
    napi_value select_keys;
    NODE_API_CALL(env, napi_create_array_with_length(
                           env, context.menu.num_candidates, &select_keys));
    NODE_API_CALL(
        env, napi_set_named_property(env, menu, "select_keys", select_keys));
    for (int i = 0; i < context.menu.num_candidates; i++) {
      napi_value select_key;
      NODE_API_CALL(env,
                    napi_create_string_utf8(env, &context.menu.select_keys[i],
                                            NAPI_AUTO_LENGTH, &select_key));
      NODE_API_CALL(env, napi_set_element(env, select_keys, i, select_key));
    }
  }
  if (!RimeFreeContext(&context))
    napi_throw_error(env, NULL, "cannot free context");
  return result;
}

static napi_value getCommit(napi_env env, napi_callback_info info) {
  napi_value result, text, argv[1];
  RimeSessionId session_id;
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  RIME_STRUCT(RimeCommit, commit);
  if (!RimeGetCommit(session_id, &commit))
    napi_throw_error(env, NULL, "cannot get commit");
  NODE_API_CALL(env, napi_create_object(env, &result));
  NODE_API_CALL(
      env, napi_create_string_utf8(env, commit.text, NAPI_AUTO_LENGTH, &text));
  NODE_API_CALL(env, napi_set_named_property(env, result, "text", text));
  if (!RimeFreeCommit(&commit))
    napi_throw_error(env, NULL, "cannot free commit");
  return result;
}

static napi_value commitComposition(napi_env env, napi_callback_info info) {
  napi_value result, argv[1];
  RimeSessionId session_id;
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  NODE_API_CALL(
      env, napi_create_int32(env, RimeCommitComposition(session_id), &result));
  return result;
}

static napi_value clearComposition(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  RimeSessionId session_id;
  SET_ARGV(env, argv);
  SET_SESSION_ID(env, argv[0], session_id);
  RimeClearComposition(session_id);
  return NULL;
}

NAPI_MODULE_INIT(/* napi_env env, napi_value exports */) {
  char *names[] = {"init",
                   "createSession",
                   "destroySession",
                   "getCurrentSchema",
                   "getSchemaList",
                   "selectSchema",
                   "processKey",
                   "getContext",
                   "getCommit",
                   "commitComposition",
                   "clearComposition"};
  napi_callback callbacks[] = {
      init,          createSession,     destroySession,  getCurrentSchema,
      getSchemaList, selectSchema,      processKey,      getContext,
      getCommit,     commitComposition, clearComposition};
  napi_value functions[sizeof(names) / sizeof(names[0])];
  for (size_t i = 0; i < sizeof(names) / sizeof(names[0]); i++) {
    NODE_API_CALL(env, napi_create_function(env, names[i], NAPI_AUTO_LENGTH,
                                            callbacks[i], NULL, &functions[i]));

    NODE_API_CALL(
        env, napi_set_named_property(env, exports, names[i], functions[i]));
  }

  return exports;
}
