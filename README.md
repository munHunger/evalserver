# Evalserver

Eval server is a REST mocking tool that allows templating and changing of states.

## Starting

You can start the server as follows
```
const { startServer } = require("./index")

startServer(9000, "./mock/", "mock", "status");
```

| startServer | |
| ---------- | ------------- |
| port       | The port to host the mocking server on |
| mockFolder | The folder to look in for mocks      |
| mockPrefix | A prefix url to the mock, i.e `localhost:port/prefix` will point to root      |
| statusPrefix | A prefix url to get to the status pages |

## Structure

Each endpoint should be located in a separate folder under you mock folder.

The folder should contain a `get.json` with a template to be returned.

The template can contain `{{variables}}` that will be matched to a state found in `state.js` which should do a "normal" `module.exports` of its state.

## Example

mock/asd/get.json:
```
{
    "param": "hello {{data}}!"
}
```

mock/asd/state.js:
```
module.exports = {
    data: "world"
}
```

HTTP GET `http://localhost:9000/mock/asd/`
```
{
    "param": "hello world!"
}
```

HTTP GET `http://localhost:9000/status/asd/`
```
{
  "hits": 1
}
```