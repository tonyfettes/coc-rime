#include <err.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <json.h>
#include <rime_api.h>

#define DEFAULT_BUFFER_SIZE 1024
typedef enum _RimeRequestType {
  IOError,
  Invalid,
  Schema,
  Context,
} RimeRequestType;

typedef enum _RimeRequestAction {
  Nop,
  GetCurrent,
  GetList,
  Select,
} RimeRequestAction;

typedef struct _RimeRequest {
  json_object *root;
  RimeRequestType type;
} RimeRequest;

static volatile sig_atomic_t done = 0;

static void signal_handler(int sig);
static RimeRequest get_request();

// Schema Management
static bool get_schema_request(json_object *root, RimeRequestAction *action,
                               const char **schema_id);
static char *get_schema_response(RimeSessionId session_id,
                                 RimeRequestAction action,
                                 const char *schema_id);

// Context (Candidate list)
static bool get_context_request(json_object *root,
                                int keycode[DEFAULT_BUFFER_SIZE],
                                int *num_keycode, int *modifiers);
static char *get_context_response(RimeSessionId session_id);

int main(int argc, char *argv[]) {
  if (argc < 4)
    errx(EXIT_FAILURE, "usage: %s shared_data_dir user_data_dir log_dir",
         argv[0]);
  struct sigaction act = {.sa_handler = signal_handler};
  sigaction(SIGINT, &act, NULL);
  sigaction(SIGTERM, &act, NULL);

  RIME_STRUCT(RimeTraits, rime_traits);
  rime_traits.shared_data_dir = argv[1];
  rime_traits.user_data_dir = argv[2];
  rime_traits.log_dir = argv[3];
  rime_traits.distribution_name = "Rime";
  rime_traits.distribution_code_name = PROJECT_NAME;
  rime_traits.distribution_version = PROJECT_VERSION;
  rime_traits.app_name = "rime." PROJECT_NAME;
  RimeSetup(&rime_traits);
  RimeInitialize(&rime_traits);
  RimeStartMaintenance(false);
  RimeSessionId session_id = RimeCreateSession();

  while (!done) {
    RimeRequest req = get_request();
    if (!RimeFindSession(session_id)) {
      session_id = RimeCreateSession();
    }
    char *outstr = strdup("null");
    if (req.type == IOError) {
      break;
    } else if (req.type == Schema) {
      const char *schema_id = NULL;
      RimeRequestAction schema_action;
      get_schema_request(req.root, &schema_action, &schema_id);
      outstr = get_schema_response(session_id, schema_action, schema_id);
    } else if (req.type == Context) {
      int keycode[DEFAULT_BUFFER_SIZE];
      int num_keycode;
      int modifiers;
      get_context_request(req.root, keycode, &num_keycode, &modifiers);
      int status = 0;
      for (int i = 0; i < num_keycode; i++) {
        status = RimeProcessKey(session_id, keycode[i], modifiers);
      }
      if (status) {
        outstr = get_context_response(session_id);
      } // otherwise, outstr will point to "null".
    }
    puts(outstr);
    free(outstr);
    fflush(stdout);
  }

  RimeDestroySession(session_id);
  RimeFinalize();
  return EXIT_SUCCESS;
}

static void signal_handler(int sig) { done = 1; }

// JSON API Design
//
// A Request:
//
// ```json
// {
//   "type": number: 0 -> IOError, 1 -> Invalid, 2 -> SchemaList, 3 -> Context
//   "content": object
//     Empty object for type in (0, 1),
//     { "keyCode": number, "modifiers": number } for Context
//     { "action": number, "name": string } for SchemaList
// }
// ```

static RimeRequest get_request() {
  RimeRequest req = {.type = Invalid};
  char str[DEFAULT_BUFFER_SIZE];
  if (!fgets(str, DEFAULT_BUFFER_SIZE, stdin)) {
    req.type = IOError;
    return req;
  }
  req.root = json_tokener_parse(str);
  json_object *type_obj;
  json_object *content_obj;
  bool ok = true;
  if (!json_object_object_get_ex(req.root, "type", &type_obj) ||
      json_object_get_type(type_obj) != json_type_int) {
    ok = false;
  }
  if (!json_object_object_get_ex(req.root, "content", &content_obj) ||
      json_object_get_type(content_obj) != json_type_object) {
    ok = false;
  }
  if (ok) {
    req.root = content_obj;
    req.type = json_object_get_int(type_obj);
  } else {
    req.root = NULL;
    req.type = Invalid;
  }
  return req;
}

static bool get_schema_request(json_object *root, RimeRequestAction *action,
                               const char **schema_id) {
  json_object *action_obj;
  json_object *schema_id_obj;
  bool ok = true;
  if (!json_object_object_get_ex(root, "action", &action_obj) ||
      json_object_get_type(action_obj) != json_type_int) {
    ok = false;
  }
  if (!json_object_object_get_ex(root, "schemaId", &schema_id_obj) ||
      json_object_get_type(schema_id_obj) != json_type_string) {
    ok = false;
  }
  if (ok) {
    *action = json_object_get_int(action_obj);
    *schema_id = json_object_get_string(schema_id_obj);
  } else {
    *action = Nop;
    *schema_id = NULL;
  }
  return true;
}

static char *get_schema_response(RimeSessionId session_id,
                                 RimeRequestAction action,
                                 const char *schema_id) {
  char *ret = NULL;
  json_object *root = json_object_new_object();
  if (action == GetCurrent) {
    char buffer[DEFAULT_BUFFER_SIZE];
    if (RimeGetCurrentSchema(session_id, buffer, DEFAULT_BUFFER_SIZE)) {
      json_object_object_add(root, "schemaId", json_object_new_string(buffer));
    }
  } else if (action == GetList) {
    json_object *schema_list_json = NULL;
    RimeSchemaList schema_list;
    if (RimeGetSchemaList(&schema_list)) {
      schema_list_json = json_object_new_array_ext(schema_list.size);
      for (size_t i = 0; i < schema_list.size; i++) {
        json_object *schema_item = json_object_new_object();
        json_object_object_add(
            schema_item, "schemaId",
            json_object_new_string(schema_list.list[i].schema_id));
        json_object_object_add(
            schema_item, "name",
            json_object_new_string(schema_list.list[i].name));
        json_object_array_add(schema_list_json, schema_item);
      }
    }
    json_object_object_add(root, "schemaList", schema_list_json);
    RimeFreeSchemaList(&schema_list);
  } else if (action == Select) {
    json_bool is_success = false;
    is_success = RimeSelectSchema(session_id, schema_id);
    json_object_object_add(root, "success",
                           json_object_new_boolean(is_success));
  }
  ret = strdup(json_object_to_json_string_ext(root, JSON_C_TO_STRING_PLAIN));
  json_object_put(root);
  return ret;
}

static bool get_context_request(json_object *root,
                                int keycode[DEFAULT_BUFFER_SIZE],
                                int *num_keycode, int *modifiers) {
  json_object *keycode_obj;
  json_object *modifiers_obj;
  bool ok = true;
  if (!json_object_object_get_ex(root, "keyCode", &keycode_obj) ||
      json_object_get_type(keycode_obj) != json_type_array) {
    ok = false;
  }
  if (!json_object_object_get_ex(root, "modifiers", &modifiers_obj) ||
      json_object_get_type(modifiers_obj) != json_type_int) {
    ok = false;
  }
  if (ok) {
    for (size_t i = 0; i < json_object_array_length(keycode_obj); i++) {
      json_object *temp_keycode = json_object_array_get_idx(keycode_obj, i);
      if (json_object_get_type(temp_keycode) != json_type_int) {
        ok = false;
        break;
      } else {
        keycode[i] = json_object_get_int(temp_keycode);
      }
    }
    *num_keycode = json_object_array_length(keycode_obj);
    *modifiers = json_object_get_int(modifiers_obj);
  }
  if (!ok) {
    *num_keycode = 0;
    *modifiers = 0;
  }
  json_object_put(root);
  return true;
}

static char *get_context_response(RimeSessionId session_id) {
  json_object *root = json_object_new_object();

  json_object *composition_json = NULL;
  json_object *menu_json = NULL;
  RIME_STRUCT(RimeContext, context);
  if (RimeGetContext(session_id, &context)) {
    if (context.composition.preedit) {
      composition_json = json_object_new_object();
      json_object_object_add(
          composition_json, "preEdit",
          json_object_new_string(context.composition.preedit));
    }
    if (context.menu.candidates) {
      menu_json = json_object_new_object();
      json_object *candidates_json = json_object_new_array();

      // candidate_cnt: to label the candidate. For sort/priority.
      int candidate_cnt = 0;
      while (context.menu.is_last_page == False) {
        for (int i = 0; i < context.menu.num_candidates; i++) {
          json_object *candidate = json_object_new_object();
          json_object_object_add(
              candidate, "text",
              json_object_new_string(context.menu.candidates[i].text));
          if (context.menu.candidates[i].comment) {
            json_object_object_add(
                candidate, "comment",
                json_object_new_string(context.menu.candidates[i].comment));
          } else {
            json_object_object_add(candidate, "comment", NULL);
          }
          json_object_object_add(candidate, "label",
                                 json_object_new_int(candidate_cnt));
          json_object_array_add(candidates_json, candidate);
          candidate_cnt++;
        }
        // Turn to next page ...
        RimeProcessKey(session_id, (int)'=', 0);
        // and grab content.
        RimeGetContext(session_id, &context);
      }
      json_object_object_add(menu_json, "candidates", candidates_json);
    }
    RimeFreeContext(&context);
  }
  json_object_object_add(root, "composition", composition_json);
  json_object_object_add(root, "menu", menu_json);

  char *str =
      strdup(json_object_to_json_string_ext(root, JSON_C_TO_STRING_PLAIN));
  json_object_put(root);
  return str;
}
