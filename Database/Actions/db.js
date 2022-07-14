import { collection } from "../Config/Collection.js";
import { get } from "../Config/Connection.js";
export const db = {
  //saving user deatils to db

  saveUser: (user) => {
    get()
      .collection(collection.USER_COLLECTION)
      .createIndex({ userId: 1 }, { unique: true });
    get()
      .collection(collection.USER_COLLECTION)
      .insertOne(user)
      .catch((err) => {
        console.log("already existing user");
      });
  },
  getAUser: (userId) => {
    return new Promise((resolve, reject) => {
      try {
        get()
          .collection(collection.USER_COLLECTION)
          .findOne({ userId: userId })
          .then((res) => {
            res ? resolve(res) : resolve(false);
          });
      } catch (error) {
        console.log(error);
      }
    });
  },
  updateUser: (user) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { userId: user.userId },
          {
            $set: {
              first_name: user.first_name,
              username: user.username,
            },
          }
        )
        .then((res) => {
          {
            !res ? console.log("UpdateError") : null;
          }
        });
    });
  },

  //getting user data for statitics and broadcast purpose

  getUser: () => {
    return new Promise(async (resolve, reject) => {
      get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },

  //Getting all admins
  getAdmin: () => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.USER_COLLECTION)
        .find({ admin: true })
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },

  //updating user database by removing blocked users details from the database

  updateUser: (userId) => {
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.USER_COLLECTION)
        .deleteOne({ userId: userId })
        .then((res) => {
          resolve(res);
        });
    });
  },

  //saving files to database

  saveFile: (fileDetails) => {
    get()
      .collection(collection.FILE_COLLECTION)
      .createIndex({ file_name: "text" });
    get()
      .collection(collection.FILE_COLLECTION)
      .insertOne(fileDetails)
      .then((res) => {
        console.log("file saved");
      });
  },

  //searching and finding file id from database

  getFile: (query) => {
    return new Promise(async (resolve, reject) => {
      get()
        .collection(collection.FILE_COLLECTION)
        .findOne({ shortid: query })
        .then((res) => {
          resolve(res);
        });
    });
  },

  //getting all file collection array

  getAllFiles: () => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.FILE_COLLECTION)
        .find({})
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },

  //getting file as array for inline query

  getfileInline: (query) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.FILE_COLLECTION)
        .find({ file_name: { $regex: query, $options: "i" } })
        .toArray()
        .then((res) => {
          console.log(res);
          resolve(res);
        });
    });
  },

  //removing file with file_id

  removeFile: (shortid) => {
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.FILE_COLLECTION)
        .deleteOne({ shortid: shortid })
        .then((res) => {
          resolve(res);
        });
    });
  },

  //Adding new admins
  addnewAdmin: (id) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ userId: id }, { $set: { admin: true } })
        .then((res) => {
          resolve(res);
        });
    });
  },

  //removing admins
  removeAdmin: (id) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.USER_COLLECTION)
        .updateOne({ userId: id }, { $set: { admin: false } })
        .then((res) => {
          resolve(res);
        });
    });
  },

  //ban user with user ID
  // banUser: (id) => {
  //   return new Promise(async (resolve, reject) => {
  //     await get()
  //       .collection(collection.BANNED_COLLECTION)
  //       .insertOne(id)
  //       .then((res) => {
  //         resolve(res);
  //       });
  //   });
  // },
  banUser: (id) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { userId: id },
          {
            $set: { banStatus: true },
          }
        )
        .then((res) => {
          resolve(res);
        });
    });
  },

  //Checking if user is banned or not to acess the bot

  checkBan: (id) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.BANNED_COLLECTION)
        .findOne({ id: id })
        .then((res) => {
          console.log(res);
          if (res) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
    });
  },

  //unban the user with user ID

  unBan: (id) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { userId: id },
          {
            $set: { banStatus: false },
          }
        )
        .then((res) => {
          resolve(res);
        });
    });
  },

  //remove the whole collection to remove all files

  deleteCollection: () => {
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.FILE_COLLECTION)
        .deleteMany({})
        .then((res) => {
          resolve(res);
        });
    });
  },
  //removing all files send by a user

  removeUserFile: (id) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.FILE_COLLECTION)
        .deleteMany({ userId: id })
        .then((res) => resolve(res));
    });
  },
  //Saving broadcast message to database

  saveBroadcastPost: (data) => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.BROADCAST_COLLECTION)
        .insertOne(data)
        .then((res) => {
          resolve(res);
        });
    });
  },
  //Getting broadcast message data

  getBroadcastPost: () => {
    return new Promise(async (resolve, reject) => {
      await get()
        .collection(collection.BROADCAST_COLLECTION)
        .find({})
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },
  //saving post details
  savePost: (post) => {
    get()
      .collection(collection.BROADCAST_COLLECTION)
      .createIndex({ id: 1 }, { unique: true, dropDups: true });
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.BROADCAST_COLLECTION)
        .insertOne(post)
        .then((res) => {
          resolve(res);
        });
    });
  },
  //getting individual broadcast post
  getOneBroadcast: (postID) => {
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.BROADCAST_COLLECTION)
        .findOne({ id: postID })
        .then((res) => {
          resolve(res);
        });
    });
  },
  //saving bot assets(channel details,welcome message etc)
  saveBotAssets: (assets) => {
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.ASSSETS_COLLECTION)
        .insertOne(assets)
        .then((res) => {
          resolve(res);
        });
    });
  },
  //getting assets collection data
  getBotAssets: () => {
    return new Promise((resolve, reject) => {
      get()
        .collection(collection.ASSSETS_COLLECTION)
        .find({})
        .toArray()
        .then((res) => {
          resolve(res);
        });
    });
  },
};
