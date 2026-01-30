import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using Http;

@service(#{
  title: "MotorCato MESS API"
})
@server("https://www.motorcato.org/api/1", "Primary Production Server")
namespace MotorCato;

/* --- Models --- */

model JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: int32 | string | null;
  result: T;
}

@example(#{
  name: "Estes Industries",
  failureCount: 1204,
  lastFailure: "2025-06-14",
  searchURL: "/search?manufacturer=Estes%20Industries",
  source_url: "https://www.motorcato.org/search?manufacturer=Estes%20Industries"
})
model Manufacturer {
  @doc("The official name of the manufacturer (e.g., 'AeroTech')")
  name: string;

  @doc("Total number of failures across all motors for this manufacturer")
  failureCount: int32;

  @doc("The most recent failure data for the manufacturer.")
  lastFailure?: string;

  @doc("Path for a search of all failures for the manufacturer.")
  searchURL: "/search?manufacturer=Estes%20Industries",

  @doc("Link to a search of all failures for the manufacturer on MotorCato.")
  source_url: url;
}

model ManufacturersResponse {
  @doc("The number of manufacturers known.")
  count: int32;

  @doc("The known manufacturers.")
  manufacturers: Manufacturer[];

  @doc("Link to MotorCato.")
  source_url: url;
}

@example(#{
  manufacturer: "AeroTech",
  motor: "G25",
  failureCount: 3,
  lastFailure: "2020-11-07",
  searchURL: "/search?manufacturer=AeroTech&name=G25",
  source_url: "https://www.motorcato.org/search?manufacturer=AeroTech&name=G25"
})
model MotorSummary {
  @doc("The manufacturer name")
  manufacturer: string;

  @doc("The motor common name (e.g., 'G25')")
  motor: string;

  @doc("Number of recorded failure reports for this motor.")
  failureCount: int32;

  @doc("The most recent failure data for the motor.")
  lastFailure?: string;

  @doc("Path for a search of all failures for the motor.")
  searchURL: string;

  @doc("Link to a search of all failures for the motor on MotorCato.")
  source_url: url;
}

model MotorsResponse {
  @doc("The number of motors known for this manufacturer.")
  count: int32;

  @doc("The known motors for this manufacturer.")
  motors: MotorSummary[];

  @doc("Link to a search of all failures for the manufacturer on MotorCato.")
  source_url: url;
}

/* --- Endpoints --- */

@route("/manufacturers")
@doc("Retrieve a list of all manufacturers represented in the MESS database.")
interface Manufacturers {
  @get op list(): {
    @body body: JsonRpcResponse<ManufacturersResponse>;
  };
}

@route("/motors")
@doc("Retrieve a summary of all motors for a specific manufacturer that have reported data.")
interface Motors {
  @get op listByBrand(
    @query manufacturer: string
  ): {
    @body body: JsonRpcResponse<MotorsResponse>;
  };
}

@route("/motor")
@doc("Retrieve a summary for a specific motor by a specific manufacturer.")
interface Motor {
  @get op getReports(
    @query manufacturer: string,
    @query motor: string
  ): {
    @body body: JsonRpcResponse<MotorSummary>;
  };
}
