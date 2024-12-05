#include <napi.h>
#include <rime_api.h>

using Napi::Addon, Napi::Env, Napi::CallbackInfo, Napi::Value, Napi::Object,
    Napi::Array, Napi::String, Napi::Number, Napi::Boolean;

#define DEFAULT_BUFFER_SIZE 1024

/*! \class Traits : public Object
 *  \brief provide traits()
 *
 *  traits() generates RimeTraits
 */
class Traits : public Object {
  RimeTraits _traits = {};

public:
  Traits(napi_env env, napi_value value) : Object(env, value) {
    RIME_STRUCT_INIT(RimeTraits, this->_traits);
    if (this->Has("shared_data_dir"))
      this->shared_data_dir =
          this->Get("shared_data_dir").As<String>().Utf8Value().c_str();
    if (this->Has("user_data_dir"))
      this->user_data_dir =
          this->Get("user_data_dir").As<String>().Utf8Value().c_str();
    if (this->Has("log_dir"))
      this->log_dir = this->Get("log_dir").As<String>().Utf8Value().c_str();
    if (this->Has("distribution_name"))
      this->distribution_name =
          this->Get("distribution_name").As<String>().Utf8Value().c_str();
    if (this->Has("distribution_code_name"))
      this->distribution_code_name =
          this->Get("distribution_code_name").As<String>().Utf8Value().c_str();
    if (this->Has("distribution_version"))
      this->distribution_version =
          this->Get("distribution_version").As<String>().Utf8Value().c_str();
    if (this->Has("app_name"))
      this->app_name = this->Get("app_name").As<String>().Utf8Value().c_str();
    if (this->Has("min_log_level"))
      this->min_log_level =
          this->Get("min_log_level").As<Number>().Int64Value();
  }
  RimeTraits &traits() {
    this->_traits.shared_data_dir = this->shared_data_dir;
    this->_traits.user_data_dir = this->user_data_dir;
    this->_traits.log_dir = this->log_dir;
    this->_traits.distribution_name = this->distribution_name;
    this->_traits.distribution_code_name = this->distribution_code_name;
    this->_traits.distribution_version = this->distribution_version;
    this->_traits.app_name = this->app_name;
    this->_traits.min_log_level = this->min_log_level;
    return this->_traits;
  };
  const char *shared_data_dir = "/usr/share/rime-data";
  const char *user_data_dir = "/root/.config/ibus/rime";
  const char *log_dir = "/root/.config/coc/extensions/coc-rime-data";
  const char *distribution_name = "Rime";
  const char *distribution_code_name = "rime.coc-rime";
  const char *distribution_version = "0.0.1";
  const char *app_name = "coc-rime";
  int64_t min_log_level = 3;
};

/*! \class SchemaListItem : public Object
 *  \brief provide New()
 *
 *  New() accepts RimeSchemaListItem
 */
class SchemaListItem : public Object {
public:
  SchemaListItem() : Object() {}
  SchemaListItem(napi_env env, napi_value value) : Object(env, value) {}
  static SchemaListItem New(napi_env env, RimeSchemaListItem &schemalistitem) {
    napi_value value;
    napi_status status = napi_create_object(env, &value);
    NAPI_THROW_IF_FAILED(env, status, SchemaListItem());
    SchemaListItem result(env, value);
    result.Set("name", schemalistitem.name);
    result.Set("schema_id", schemalistitem.schema_id);
    return result;
  }
};

/*! \class Composition : public Object
 *  \brief provide New()
 *
 *  New() accepts RimeComposition
 */
class Composition : public Object {
public:
  Composition() : Object() {}
  Composition(napi_env env, napi_value value) : Object(env, value) {}
  static Composition New(napi_env env, RimeComposition &composition) {
    napi_value value;
    napi_status status = napi_create_object(env, &value);
    NAPI_THROW_IF_FAILED(env, status, Composition());
    Composition result(env, value);
    result.Set("length", composition.length);
    result.Set("cursor_pos", composition.cursor_pos);
    result.Set("sel_start", composition.sel_start);
    result.Set("sel_end", composition.sel_end);
    result.Set("preedit", composition.preedit ? composition.preedit : "");
    return result;
  }
};

/*! \class Candidate : public Object
 *  \brief provide New()
 *
 *  New() accepts RimeCandidate
 */
class Candidate : public Object {
public:
  Candidate() : Object() {}
  Candidate(napi_env env, napi_value value) : Object(env, value) {}
  static Candidate New(napi_env env, RimeCandidate &candidate) {
    napi_value value;
    napi_status status = napi_create_object(env, &value);
    NAPI_THROW_IF_FAILED(env, status, Candidate());
    Candidate result(env, value);
    result.Set("text", candidate.text ? candidate.text : "");
    result.Set("comment", candidate.comment ? candidate.comment : "");
    return result;
  }
};

/*! \class Menu : public Object
 *  \brief provide New()
 *
 *  New() accepts RimeMenu
 */
class Menu : public Object {
public:
  Menu() : Object() {}
  Menu(napi_env env, napi_value value) : Object(env, value) {}
  static Menu New(napi_env env, RimeMenu &menu) {
    napi_value value;
    napi_status status = napi_create_object(env, &value);
    NAPI_THROW_IF_FAILED(env, status, Menu());
    Menu result(env, value);
    result.Set("page_size", menu.page_size);
    result.Set("page_no", menu.page_no);
    result.Set("is_last_page", menu.is_last_page == 1);
    result.Set("highlighted_candidate_index", menu.highlighted_candidate_index);
    result.Set("num_candidates", menu.num_candidates);
    result.Set("select_keys", menu.select_keys ? menu.select_keys : "");
    Array candidates = Array::New(env, menu.num_candidates);
    for (int i = 0; i < menu.num_candidates; i++)
      candidates.Set(i, Candidate::New(env, menu.candidates[i]));
    result.Set("candidates", candidates);
    return result;
  }
};

/*! \class Context : public Object
 *  \brief provide New()
 *
 *  New() accepts RimeMenu
 */
class Context : public Object {
public:
  Context() : Object() {}
  Context(napi_env env, napi_value value) : Object(env, value) {}
  static Context New(napi_env env, RimeContext &context) {
    napi_value value;
    napi_status status = napi_create_object(env, &value);
    NAPI_THROW_IF_FAILED(env, status, Context());
    Context result(env, value);
    result.Set("composition", Composition::New(env, context.composition));
    result.Set("menu", Menu::New(env, context.menu));
    return result;
  }
};

/*! \class Commit : public Object
 *  \brief provide New()
 *
 *  New() accepts RimeCommit
 */
class Commit : public Object {
public:
  Commit() : Object() {}
  Commit(napi_env env, napi_value value) : Object(env, value) {}
  static Commit New(napi_env env, RimeCommit &commit) {
    napi_value value;
    napi_status status = napi_create_object(env, &value);
    NAPI_THROW_IF_FAILED(env, status, Commit());
    Commit result(env, value);
    result.Set("text", commit.text ? commit.text : "");
    return result;
  }
};

/*! \class Rime : public Addon<Rime>
 *  \brief node addon for librime
 *
 *  node addon for librime
 */
class Rime : public Addon<Rime> {
  RimeApi *rime;

public:
  Rime(Env env, Object exports) {
    this->rime = rime_get_api();
    DefineAddon(
        exports,
        {
            InstanceMethod("init", &Rime::init, napi_enumerable),
            InstanceMethod("create_session", &Rime::create_session,
                           napi_enumerable),
            InstanceMethod("destroy_session", &Rime::destroy_session,
                           napi_enumerable),
            InstanceMethod("get_current_schema", &Rime::get_current_schema,
                           napi_enumerable),
            InstanceMethod("get_schema_list", &Rime::get_schema_list,
                           napi_enumerable),
            InstanceMethod("select_schema", &Rime::select_schema,
                           napi_enumerable),
            InstanceMethod("process_key", &Rime::process_key, napi_enumerable),
            InstanceMethod("get_context", &Rime::get_context, napi_enumerable),
            InstanceMethod("get_commit", &Rime::get_commit, napi_enumerable),
            InstanceMethod("commit_composition", &Rime::commit_composition,
                           napi_enumerable),
            InstanceMethod("clear_composition", &Rime::clear_composition,
                           napi_enumerable),
        });
  }

protected:
  Value init(const CallbackInfo &info) {
    RimeTraits traits;
    if (info[0].IsNull())
      traits = info[0].As<Traits>().traits();
    else
      traits = Object::New(info.Env()).As<Traits>().traits();
    rime->setup(&traits);
    rime->initialize(&traits);
    return info.Env().Undefined();
  }
  Value create_session(const CallbackInfo &info) {
    return Number::New(info.Env(), rime->create_session());
  }
  Value destroy_session(const CallbackInfo &info) {
    rime->destroy_session(info[0].As<Number>().Int64Value());
    return info.Env().Undefined();
  }
  Value get_current_schema(const CallbackInfo &info) {
    char schema_id[DEFAULT_BUFFER_SIZE];
    rime->get_current_schema(info[0].As<Number>().Int64Value(), schema_id,
                             sizeof(schema_id));
    return String::New(info.Env(), schema_id);
  }
  Value get_schema_list(const CallbackInfo &info) {
    RimeSchemaList schema_list;
    if (!rime->get_schema_list(&schema_list))
      return info.Env().Null();
    Array result = Array::New(info.Env(), schema_list.size);
    for (unsigned long i = 0; i < schema_list.size; i++) {
      SchemaListItem schema =
          SchemaListItem::New(info.Env(), schema_list.list[i]);
      result.Set(i, schema);
    }
    return result;
  }
  Value select_schema(const CallbackInfo &info) {
    return Boolean::New(
        info.Env(),
        rime->select_schema(info[0].As<Number>().Int64Value(),
                            info[1].As<String>().Utf8Value().c_str()));
  }
  Value process_key(const CallbackInfo &info) {
    return Boolean::New(info.Env(),
                        rime->process_key(info[0].As<Number>().Int64Value(),
                                          info[1].As<Number>().Int32Value(),
                                          info[2].As<Number>().Int32Value()));
  }
  Value get_context(const CallbackInfo &info) {
    RIME_STRUCT(RimeContext, context);
    if (rime->get_context(info[0].As<Number>().Int64Value(), &context))
      return Context::New(info.Env(), context);
    return info.Env().Null();
  }
  Value get_commit(const CallbackInfo &info) {
    RIME_STRUCT(RimeCommit, commit);
    if (rime->get_commit(info[0].As<Number>().Int64Value(), &commit))
      return Commit::New(info.Env(), commit);
    return info.Env().Null();
  }
  Value commit_composition(const CallbackInfo &info) {
    return Boolean::New(info.Env(), rime->commit_composition(
                                        info[0].As<Number>().Int64Value()));
  }
  Value clear_composition(const CallbackInfo &info) {
    rime->clear_composition(info[0].As<Number>().Int64Value());
    return info.Env().Undefined();
  }
};

NODE_API_ADDON(Rime)
