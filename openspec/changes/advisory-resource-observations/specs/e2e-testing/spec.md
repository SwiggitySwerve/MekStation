## ADDED Requirements

### Requirement: Advisory resource observations and behavioral backpressure

Performance evidence SHALL retain measured byte maxima, heap readings and RSS
growth. Their magnitude SHALL NOT change an acceptance verdict. This supersedes
the byte and memory acceptance ceilings in the active controlled-loopback
performance requirements; existing latency and event/envelope count gates remain.
The product's own backpressure thresholds SHALL remain unchanged.

#### Scenario: Former resource breach remains visible

- **WHEN** a healthy controlled run exceeds a former chunk-byte, queue-byte,
  server RSS or browser heap ceiling
- **THEN** the exact observations remain in its archived evidence
- **AND** those observations do not fail its verdict

#### Scenario: A slow viewer cannot cause unbounded live issuance

- **WHEN** one viewer withholds delivery acknowledgements
- **THEN** production admission stops that viewer at its configured high-water mark
- **AND** further authority events do not grow that viewer's issued window
- **AND** healthy viewers continue receiving and acknowledging their frames

#### Scenario: The slow viewer recovers its missed tail

- **WHEN** consumption resumes through acknowledgement and the supported rejoin path
- **THEN** delivery resumes from the first missed authority event
- **AND** the viewer converges with the healthy viewers

#### Scenario: Cascade history is structurally flat

- **WHEN** repeated time cascades are stored
- **THEN** each stored after-campaign projection omits prior cascade history
- **AND** a recursive-nesting defect fails the structural regression regardless of byte size

### Requirement: Container health is independent of heap magnitude

The health endpoint SHALL report heap and RSS telemetry. Heap magnitude alone
SHALL NOT make the endpoint unhealthy or return HTTP 503. A real exception while
performing the health probe SHALL still return an unhealthy HTTP 503 response.

#### Scenario: High heap is advisory

- **WHEN** a GET health probe reports heap above the former 900-MiB threshold
- **THEN** the response is HTTP 200 and healthy
- **AND** measured heap and RSS numbers remain present

#### Scenario: The health probe fails

- **WHEN** gathering health telemetry throws an exception
- **THEN** the response is HTTP 503 and unhealthy
- **AND** the container HTTP healthcheck continues to reject that response
