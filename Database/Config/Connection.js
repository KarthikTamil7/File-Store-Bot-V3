import { MongoClient } from "mongodb";
import { collection } from "./Collection.js";
import dotenv from "dotenv";
dotenv.config();

const state = {
  db: null,
};

export const connect = function (done) {
  const url = process.env.DB_URL;
  const dbname = "files";

  MongoClient.connect(url, { useUnifiedTopology: true }, (err, data) => {
    if (err) return done(err);
    state.db = data.db(dbname);
    done();
  });
};

export const get = function () {
  return state.db;
};
