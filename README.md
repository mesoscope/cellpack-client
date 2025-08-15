# cellPACK Client

### Description
Front end website to interact with the cellPACK services running in AWS. This webpage allows users to run cellPACK packings without having to run code manually or use the commandline.

### Prerequisite
1. Install bun https://bun.sh/docs/installation

### Setup
1. Install dependencies: `bun install`

### Run locally
1. `bun run dev`
2. Navigate to http://localhost:5173/ in your browser

### Run Tests
1. `bun test`

### cellPACK Server
This client interacts with the cellPACK server, which consists of a variety of backend services hosted in AWS to run [cellPACK packings](https://github.com/mesoscope/cellpack). These AWS services include:
* **API Gateway**: cellPACK REST API providing this client with access to needed AWS resources for running and receiving data from cellPACK jobs. Includes the following endpoints:
  * POST /submit-packing?recipe={myrecipe}&config={myconfig}
  * GET /logs?logStreamName={name}
  * GET /packing-status?jobId={id}
* **Batch**: A call to POST /submit-packing launches a new batch job to run. A call to GET /packing-status will return the status of the specified batch job. Once the job is completed, the path to the results file(s) will be added to the results table of the cellPACK Firebase database.
* **S3**: Result files from the AWS Batch job are written to the `cellpack-demo` S3 bucket.
* **ECR**: Docker image built from the [cellPACK github repo](https://github.com/mesoscope/cellpack) is published to the `cellpack-private` ECR repository. That image defines the container specificationsin which the batch job will run.
* **CloudWatch**: Logs from each AWS Batch job are written to CloudWatch. These logs can be accessed via the GET /logs endpoint.

#### Resources
* [Server Architecture Overview Diagram](https://docs.google.com/presentation/d/1eG2XCxgYNaoDIYI-M6Tzef17bGuFirZZhmfZlBFTaXc/edit#slide=id.g26c8fd413da_0_34)
* [AWS Batch Dashboard](https://us-west-2.console.aws.amazon.com/batch/home?region=us-west-2#)
* [Staging Firebase Database](https://console.firebase.google.com/u/0/project/cell-pack-database/firestore/databases/-default-/data/~2Fcomposition~2F9XjxZ0ApsNQqCXUbtVTc)
* [Project Notes](https://docs.google.com/document/d/1jqIvf8DzjWgzbG-NMMJ8pdQbi2qQ7wrzLdLqyR7F0i0/edit?tab=t.0#heading=h.yg9wht4r88xr)
