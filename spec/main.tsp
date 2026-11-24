import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Call Calendar" })
namespace CallCalendar;

model Health {
  status: "ok";
}

@route("/health")
@operationId("healthCheck")
@get
op healthCheck(): Health;
