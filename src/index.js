const fs = require("fs");
const chalk = require("chalk");
const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
const app = express();

var parseString = (s, args) => {
  with (args) {
    let start = s.search(/{{/gm);
    let end = s.search(/}}/gm);
    if (start >= 0 && end >= 0) {
      let expr = eval(s.substring(start + 2, end));
      if (expr instanceof Function) expr = expr.apply(this, []);
      s = s.substring(0, start) + expr + s.substring(end + 2);
      return parseString(s, args);
    }
    return s;
  }
};

var parseObject = (object, scope) => {
  if (typeof object === "string" || object instanceof String) {
    return parseString(object, scope);
  } else if (!object instanceof Object) {
    return object;
  }
  let result = Object.assign({}, object);
  Object.keys(result).forEach(key => {
    if (typeof result[key] === "string" || result[key] instanceof String) {
      result[key] = parseString(result[key], scope);
    } else if (Array.isArray(result[key])) {
      result[key] = result[key].map(element => parseObject(element, scope));
    } else if (result[key] instanceof Object) {
      result[key] = parseObject(result[key], scope);
    }
  });
  return result;
};

function getFolder(url, mockFolder) {
  let state = {};
  return [
    url
      .split("/")
      .filter(part => part.length > 0)
      .reduce((acc, val) => {
        if (!acc) return acc;
        if (fs.existsSync(`${acc}/${val}`)) {
          if (fs.existsSync(`${acc}/${val}/state.js`))
            state = {
              ...state,
              ...eval(fs.readFileSync(`${acc}/${val}/state.js`, "utf8"))
            };
          return acc + "/" + val;
        } else if (fs.existsSync(`${acc}/*`)) {
          if (fs.existsSync(`${acc}/*/state.js`))
            state = {
              ...state,
              ...eval(fs.readFileSync(`${acc}/${val}/state.js`, "utf8"))
            };
          return acc + "/*";
        } else {
          let file = fs
            .readdirSync(acc, "utf-8")
            .find(f => f.indexOf(":") == 0);
          if (file) {
            paramMap[file] = val;
            return acc + "/" + file;
          }
        }
      }, mockFolder)
      .replace(/\/\//gm, "/"),
    state
  ];
}

function startServer(port, mockFolder, endpointPrefix, statusPrefix) {
  return new Promise((resolve, _) => {
    app.use(cors());
    app.options("*", cors());
    app.use(bodyParser.json({ type: "application/json" }));

    app.get(
      `/${endpointPrefix}/:endpoint/**`.replace(/\/\//gm, "/"),
      (req, res) => {
        let [folder, state] = getFolder(
          req.originalUrl
            .split("/")
            .slice(2)
            .join("/"),
          mockFolder
        );
        if (folder) {
          fs.promises
            .readFile(folder + "/get.json", "utf8")
            .then(data => JSON.parse(data))
            .then(data => parseObject(data, state))
            .then(data => res.status(200).json(data))
            .then(_ => {
              let data = {};
              if (fs.existsSync(folder + "/status.json"))
                data = JSON.parse(
                  fs.readFileSync(folder + "/status.json"),
                  "utf8"
                );
              data = { hits: 0, ...data };
              data.hits++;
              fs.promises.writeFile(
                folder + "/status.json",
                JSON.stringify(data, null, 2)
              );
            });
        } else res.status(200).json({});
      }
    );

    app.get(
      `/${statusPrefix}/:endpoint/**`.replace(/\/\//gm, "/"),
      (req, res) => {
        let [folder, state] = getFolder(
          req.originalUrl
            .split("/")
            .slice(2)
            .join("/"),
          mockFolder
        );
        if (folder && fs.existsSync(folder + "/status.json"))
          fs.promises
            .readFile(folder + "/status.json")
            .then(data => JSON.parse(data))
            .then(data => res.status(200).json(data));
        else res.status(200).json({ hits: 0 });
      }
    );

    app.listen(port, () => {
      console.log(`listening to port ${chalk.magenta(port)}`);
      resolve(app);
    });
  });
}

module.exports = { startServer };
