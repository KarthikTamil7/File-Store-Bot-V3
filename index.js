import dotenv from "dotenv";
dotenv.config();
import { Telegraf, Markup } from "telegraf";
import TelegrafStatelessQuestion from "telegraf-stateless-question";
const bot = new Telegraf(process.env.TOKEN);
import { connect } from "./Database/Config/Connection.js";
import { db } from "./Database/Actions/db.js";
import shortid from "shortid";

//DATABASE CONNECTION
connect((err) => {
  if (err) {
    console.log("error connection db" + err);
  } else {
    console.log("db connected");
  }
});
bot.start(async (ctx) => {
  let msgArray = ctx.message.text.split(" ");
  msgArray.shift();
  let query = msgArray.join(" ");
  let user = {
    first_name: ctx.from.first_name,
    userId: ctx.from.id,
    username: ctx.from.username ?? "",
    admin: false,
  };

  // Collecting user data and updating in database start
  db.getAUser(ctx.from.id).then((res) => {
    res ? db.updateUser(user) : db.saveUser(user);
  });

  await bot.telegram
    .getChatMember(process.env.MAIN_CHANNEL, ctx.from.id)
    .then(async (channelStatus) => {
      if (channelStatus.status != "left") {
        if (msgArray.length < 1) {
          db.getAUser(ctx.from.id).then(async (res) => {
            if (res.admin || ctx.from.id == process.env.ADMIN) {
              return await ctx.replyWithHTML(
                `Hello <b>${ctx.from.first_name} </b> welcome to admin panel`,
                Markup.keyboard([
                  ["👤 Manage admins", "⚙ Config bot"],
                  ["📊 Bot status"],
                  ["🗑 Delete files", "☢ Delete all"],
                  ["🛑 Ban", "♻ Unban"],
                  ["💌 Broadcast"],
                ])
                  .oneTime()
                  .resize()
              );
            } else {
              ctx.reply(
                `<b>Hi👋 Bro...

I'm an HMTD Official File Store Bot Maintained by @HMTD_Links. I will Store Files for you and Give Sharable Links. Keep me Join to Our Official Channel to Receive Bot & Movies Updates in @HMTD_Links.</b>`,
                {
                  parse_mode: "HTML",
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "Search", switch_inline_query: "" }],
                    ],
                  },
                }
              );
            }
          });
        } else {
          //handle file queries
          await db.getFile(query).then((res) => {
            if (res.type == "video") {
              ctx.replyWithVideo(res.file_id, {
                caption: res.caption,
                parse_mode: "Markdown",
                reply_markup: res.reply_markup ?? null,
              });
            } else if (res.type == "photo") {
              ctx.replyWithPhoto(res.file_id, {
                caption: res.caption,
                parse_mode: "Markdown",
                reply_markup: res.reply_markup ?? null,
              });
            } else {
              ctx.replyWithDocument(res.file_id, {
                caption: res.caption,
                parse_mode: "Markdown",
                reply_markup: res.reply_markup ?? null,
              });
            }
          });
        }
      } else {
        //fetch data from db and insert channel link
        db.getBotAssets().then((res) => {
          let assets = res[0];
          ctx.replyWithHTML(
            `🔖 <i>You must join our channel to use this bot.Click joined button after joining channel</i>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✔ JOIN CHANNEL",
                      url: `${
                        assets ? assets.channel : process.env.INVITE_LINK
                      }`,
                    },
                  ],
                  [
                    {
                      text: "♻ JOINED",
                      callback_data: "CHECKJOINED",
                    },
                  ],
                ],
              },
            }
          );
        });
      }
    });
});

//=================================Handling inline keyboard functions=================================//

bot.hears("👤 Manage admins", async (ctx) => {
  if (ctx.from.id == process.env.ADMIN) {
    await db.getAdmin().then((res) => {
      if (res.length < 1) {
        ctx.reply(
          `🔑 Admin list\n\n<i>No admins found .Newly added admins can send broadcasts,delete files,ban users.Other privileges will be only available for bot admin</i>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🆕 Add Admin", callback_data: "ADD_ADMIN" }],
                [{ text: "🗑 Remove Admin", callback_data: "REMOVE_ADMIN" }],
              ],
            },
          }
        );
      } else {
        let admin = res.map((item, index) => {
          return `👤 : <code>${item.first_name}</code>\n🆔 : <code>${
            item.userId
          }</code>\n🏷 : @${item.username ?? ""}\n\n`;
        });

        ctx.reply(admin.join(""), {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🆕 Add Admin", callback_data: "ADD_ADMIN" }],
              [{ text: "🗑 Remove Admin", callback_data: "REMOVE_ADMIN" }],
            ],
          },
        });
      }
    });
  } else {
    ctx.reply("☢ Authorization failed");
  }
});

//bot status

bot.hears("📊 Bot status", (ctx) => {
  ctx.deleteMessage();
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      db.getUser().then((user) => {
        db.getAllFiles().then((files) => {
          ctx.replyWithHTML(
            `📊<b>Bot statitics</b>\n\n🧾<i>Total users</i>: ${
              user.length ?? ""
            }\n📁 <i>Total files</i>: ${files.length ?? ""}`
          );
        });
      });
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//Deleting files
bot.hears("🗑 Delete files", (ctx) => {
  ctx.deleteMessage();
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      db.getAllFiles().then((files) => {
        ctx.replyWithHTML(
          `📁 <i>Total files</i>: ${
            files.length ?? ""
          }\n\n<i>You can remove files one by one using file ID or delete a batch of files send by a particular user</i>`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "➖ Remove One", callback_data: "REMOVEONE_FILE" }],
                [
                  {
                    text: "➖ Remove Batch",
                    callback_data: "REMOVEBATCH_FILE",
                  },
                ],
              ],
            },
          }
        );
      });
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//Removing all files

bot.hears("☢ Delete all", (ctx) => {
  ctx.deleteMessage();
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      ctx.replyWithHTML(
        `❗ You are about to remove all files stored in database.Click confirm to continue`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✔ Confirm", callback_data: "CONFIRMREMOVEALLFILES" }],
            ],
          },
        }
      );
    }
  });
});

//ban users
const banUserQuestion = new TelegrafStatelessQuestion(
  "banUser",
  async (ctx) => {
    db.getAUser(ctx.from.id).then((res) => {
      if (res.admin || ctx.from.id == process.env.ADMIN) {
        db.banUser(parseInt(ctx.message.text)).then(async (stats) => {
          if (stats.modifiedCount > 0) {
            return await ctx.replyWithHTML(
              `✔ <b>Banned</b>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } else {
            return await ctx.replyWithHTML(
              `✔ <b>Something went wrong</b>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          }
        });
      } else {
        ctx.reply("☢ Authorization failed");
      }
    });
  }
);

bot.use(banUserQuestion.middleware());
bot.hears("🛑 Ban", (ctx) => {
  ctx.deleteMessage();
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      return banUserQuestion.replyWithHTML(
        ctx,
        `🆔<i> Enter user id of user to be banned</i>`
      );
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//Unban users
const unBanUserQuestion = new TelegrafStatelessQuestion(
  "unBanUser",
  async (ctx) => {
    db.getAUser(ctx.from.id).then((res) => {
      if (res.admin || ctx.from.id == process.env.ADMIN) {
        db.unBan(parseInt(ctx.message.text)).then(async (stats) => {
          if (stats.modifiedCount > 0) {
            return await ctx.replyWithHTML(
              `✔ <b>Unbanned</b>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } else {
            return await ctx.replyWithHTML(
              `✔ <b>Something went wrong</b>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          }
        });
      } else {
        ctx.reply("☢ Authorization failed");
      }
    });
  }
);

bot.use(unBanUserQuestion.middleware());

bot.hears("♻ Unban", (ctx) => {
  ctx.deleteMessage();
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      return banUserQuestion.replyWithHTML(
        ctx,
        `🆔<i> Enter user id of user to be un banned</i>`
      );
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//broadcast messages

bot.hears("💌 Broadcast", async (ctx) => {
  db.getAUser(ctx.from.id).then(async (res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      await db.getUser().then((user) => {
        ctx.reply(
          `📊 Total users: ${user.length}\n\n\n<i>You can either broadcast a message to a particular user or broadcast to all users.</i>\n<b>Note:</b>Forward message/post to be broadcasted to all users from your post bot and enter Post ID after selecting below buttons`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "💌 Broadcast All", callback_data: "BROADCAST_ALL" }],
              ],
            },
          }
        );
      });
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//Config bot button

bot.hears("⚙ Config bot", (ctx) => {
  ctx.reply(
    `⚙ <i>You can customise welcome message ,main channel link,channel id ,help message etc as you see fit</i>`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔖 EDIT CHANNEL LINK",
              callback_data: "EDITJOINCHANNELLINK",
            },
          ],
        ],
      },
    }
  );
});
//=================================Callback datas=================================//

//Adding new admins
const addNewAdminQuestion = new TelegrafStatelessQuestion(
  "addNewAdmin",
  async (ctx) => {
    if (ctx.from.id == process.env.ADMIN) {
      db.addnewAdmin(parseInt(ctx.message.text)).then(async (res) => {
        if (res.modifiedCount > 0) {
          try {
            bot.telegram.sendMessage(
              parseInt(ctx.message.text),
              `🔑 You are hired as admin`
            );
            return await ctx.replyWithHTML(
              `✔ <b>Success \n</b><i>Please check manage admin sections and verify</i>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } catch (error) {
            console.log(error);
          }
        } else {
          ctx.reply("<i>❗ Make sure user id is correct</i>", {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🆕 Add Admin", callback_data: "ADD_ADMIN" }],
              ],
            },
          });
        }
      });
    } else {
      ctx.reply("☢ Authorization failed");
    }
  }
);

bot.use(addNewAdminQuestion.middleware());

//Removing admins
const removeAdminQuestion = new TelegrafStatelessQuestion(
  "removeAdmin",
  async (ctx) => {
    if (ctx.from.id == process.env.ADMIN) {
      db.removeAdmin(parseInt(ctx.message.text)).then(async (res) => {
        if (res.modifiedCount > 0) {
          try {
            return await ctx.replyWithHTML(
              `✔ <b>Success \n</b><i>Please check manage admin sections and verify</i>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } catch (error) {
            console.log(error);
          }
        } else {
          ctx.reply("<i>❗ Make sure user id is correct</i>", {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🗑 Remove Admin", callback_data: "REMOVE_ADMIN" }],
              ],
            },
          });
        }
      });
    } else {
      ctx.reply("☢ Authorization failed");
    }
  }
);

bot.use(removeAdminQuestion.middleware());

bot.action(/(.*)_ADMIN/g, (ctx) => {
  if (ctx.from.id == process.env.ADMIN) {
    if (ctx.match[1] == "ADD") {
      return addNewAdminQuestion.replyWithHTML(
        ctx,
        `🆔 <i>Enter Id of the user to be promoted to admin.Make sure the user has already started the bot</i>`
      );
    } else if (ctx.match[1] == "REMOVE") {
      return removeAdminQuestion.replyWithHTML(
        ctx,
        `🆔 <i>Enter Id of the admin to be removed</i>`
      );
    }
  } else {
    ctx.reply("☢ Authorization failed");
  }
});

//Removing files

const removeOneFileQuestion = new TelegrafStatelessQuestion(
  "removeOneFile",
  async (ctx) => {
    await db.getAUser(ctx.from.id).then((res) => {
      if (res.admin || ctx.from.id == process.env.ADMIN) {
        db.removeFile(ctx.message.text).then(async (stats) => {
          if (stats.deletedCount > 0) {
            return await ctx.replyWithHTML(
              `✔ <b>Success</b>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } else {
            return await ctx.replyWithHTML(
              `❗ <i>Something went wrong make sure the entered shortid is correct</i>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          }
        });
      } else {
        ctx.reply("☢ Authorization failed");
      }
    });
  }
);

bot.use(removeOneFileQuestion.middleware());

//removing all files send by a user
const removeBatchFileQuestion = new TelegrafStatelessQuestion(
  "removeBatchFile",
  async (ctx) => {
    await db.getAUser(ctx.from.id).then((res) => {
      if (res.admin || ctx.from.id == process.env.ADMIN) {
        db.removeUserFile(parseInt(ctx.message.text)).then(async (stats) => {
          if (stats.deletedCount > 0) {
            return await ctx.replyWithHTML(
              `✔ <b>Success</b> <i>removed ${stats.deletedCount} files</i>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } else {
            return await ctx.replyWithHTML(
              `❗ <i>Something went wrong make sure the entered user id is correct</i>`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          }
        });
      } else {
        ctx.reply("☢ Authorization failed");
      }
    });
  }
);

bot.use(removeBatchFileQuestion.middleware());

bot.action(/(.*)_FILE/g, (ctx) => {
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      if (ctx.match[1] == "REMOVEONE") {
        return removeOneFileQuestion.replyWithHTML(
          ctx,
          `🆔 <i>Enter short Id of file to be removed</i>`
        );
      } else if (ctx.match[1] == "REMOVEBATCH") {
        return removeBatchFileQuestion.replyWithHTML(
          ctx,
          `🆔 <i>Enter user id to remove all files send by a user</i>`
        );
      }
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//Removing all files
bot.action("CONFIRMREMOVEALLFILES", (ctx) => {
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      db.deleteCollection().then(async (stats) => {
        if (stats.deletedCount > 0) {
          return await ctx.replyWithHTML(
            `✔ <b>Success</b> <i>removed ${stats.deletedCount} files</i>`,
            Markup.keyboard([
              ["👤 Manage admins", "⚙ Config bot"],
              ["📊 Bot status"],
              ["🗑 Delete files", "☢ Delete all"],
              ["🛑 Ban", "♻ Unban"],
              ["💌 Broadcast"],
            ])
              .oneTime()
              .resize()
          );
        } else {
          return await ctx.replyWithHTML(
            `❗ <i>Something went wrong try again later</i>`,
            Markup.keyboard([
              ["👤 Manage admins", "⚙ Config bot"],
              ["📊 Bot status"],
              ["🗑 Delete files", "☢ Delete all"],
              ["🛑 Ban", "♻ Unban"],
              ["💌 Broadcast"],
            ])
              .oneTime()
              .resize()
          );
        }
      });
    }
  });
});

// Broadcasting message

const broadcastAllQuestion = new TelegrafStatelessQuestion(
  "broadcastAll",
  async (ctx) => {
    await db.getAUser(ctx.from.id).then(async (res) => {
      if (res.admin || ctx.from.id == process.env.ADMIN) {
        let failedCount = 0;
        await db
          .getOneBroadcast(parseInt(ctx.message.text))
          .then(async (post) => {
            if (post) {
              db.getUser().then(async (usersarray) => {
                //reversing array to broadcast users from last to first started
                let users = usersarray.reverse();
                for (let user of users) {
                  try {
                    if (post.type === "photo") {
                      await bot.telegram.sendPhoto(user.userId, post.file_id, {
                        parse_mode: "HTML",
                        caption: post.caption ? post.caption : null,
                        reply_markup: post.reply_markup
                          ? post.reply_markup
                          : null,
                      });
                    } else if (post.type === "animation") {
                      await bot.telegram.sendAnimation(
                        user.userId,
                        post.file_id,
                        {
                          parse_mode: "HTML",
                          caption: post.caption ? post.caption : null,
                          reply_markup: post.reply_markup
                            ? post.reply_markup
                            : null,
                        }
                      );
                    } else if (post.type === "video") {
                      await bot.telegram.sendVideo(user.userId, post.file_id, {
                        parse_mode: "HTML",
                        caption: post.caption ? post.caption : null,
                        reply_markup: post.reply_markup
                          ? post.reply_markup
                          : null,
                      });
                    } else if (post.type === "document") {
                      await bot.telegram.sendDocument(
                        user.userId,
                        post.file_id,
                        {
                          parse_mode: "HTML",
                          caption: post.caption ? post.caption : null,
                          reply_markup: post.reply_markup
                            ? post.reply_markup
                            : null,
                        }
                      );
                    } else if (post.type == "text") {
                      await bot.telegram.sendMessage(user.userId, post.text, {
                        parse_mode: "HTML",
                        caption: post.caption ? post.caption : null,
                        reply_markup: post.reply_markup
                          ? post.reply_markup
                          : null,
                      });
                    }
                  } catch (error) {
                    failedCount = failedCount + 1;
                  }
                }
                return await ctx.replyWithHTML(
                  `<i>Broadcast completed</i>\n❗ Failed count : ${failedCount}`,
                  Markup.keyboard([
                    ["👤 Manage admins", "⚙ Config bot"],
                    ["📊 Bot status"],
                    ["🗑 Delete files", "☢ Delete all"],
                    ["🛑 Ban", "♻ Unban"],
                    ["💌 Broadcast"],
                  ])
                    .oneTime()
                    .resize()
                );
              });
            } else {
              return await ctx.replyWithHTML(
                `<i>No post found.Forward post from your post making bot and grab postID</i>`,
                Markup.keyboard([
                  ["👤 Manage admins", "⚙ Config bot"],
                  ["📊 Bot status"],
                  ["🗑 Delete files", "☢ Delete all"],
                  ["🛑 Ban", "♻ Unban"],
                  ["💌 Broadcast"],
                ])
                  .oneTime()
                  .resize()
              );
            }
          });
      } else {
        ctx.reply("☢ Authorization failed");
      }
    });
  }
);

bot.use(broadcastAllQuestion.middleware());

bot.action(/BROADCAST_ALL/g, (ctx) => {
  db.getAUser(ctx.from.id).then((res) => {
    if (res.admin || ctx.from.id == process.env.ADMIN) {
      return broadcastAllQuestion.replyWithHTML(
        ctx,
        `🆔 Enter postID to be broadcasted to all`
      );
    } else {
      ctx.reply("☢ Authorization failed");
    }
  });
});

//Editing join channel link

const editjoinchannelQuestion = new TelegrafStatelessQuestion(
  "editjoinchannel",
  (ctx) => {
    console.log(ctx.message.text);
  }
);

bot.action("EDITJOINCHANNELLINK", (ctx) => {
  if (ctx.from.id == process.env.ADMIN) {
    return editjoinchannelQuestion.replyWithHTML(
      ctx,
      `✏ Enter new channel link`
    );
  } else {
    ctx.reply("☢ Authorization failed");
  }
});

//Checking user joined channel or not

bot.action("CHECKJOINED", async (ctx) => {
  ctx.deleteMessage();
  await bot.telegram
    .getChatMember(process.env.MAIN_CHANNEL, ctx.from.id)
    .then(async (channelStatus) => {
      if (channelStatus.status != "left") {
        db.getAUser(ctx.from.id).then(async (res) => {
          if (res.admin || ctx.from.id == process.env.ADMIN) {
            return await ctx.replyWithHTML(
              `Hello <b>${ctx.from.first_name} </b> welcome to admin panel`,
              Markup.keyboard([
                ["👤 Manage admins", "⚙ Config bot"],
                ["📊 Bot status"],
                ["🗑 Delete files", "☢ Delete all"],
                ["🛑 Ban", "♻ Unban"],
                ["💌 Broadcast"],
              ])
                .oneTime()
                .resize()
            );
          } else {
            ctx.reply(
              `<b>I will store files for you and generate sharable links</b>`,
              {
                parse_mode: "HTML",
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "Search", switch_inline_query: "" }],
                  ],
                },
              }
            );
          }
        });
      } else {
        //fetch data from db and insert channel link
        db.getBotAssets().then((res) => {
          let assets = res[0];
          ctx.replyWithHTML(
            `🔖 <i>You must join our channel to use this bot.Click joined button after joining channel</i>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✔ JOIN CHANNEL",
                      url: `${
                        assets ? assets.channel : process.env.INVITE_LINK
                      }`,
                    },
                  ],
                  [
                    {
                      text: "♻ JOINED",
                      callback_data: "CHECKJOINED",
                    },
                  ],
                ],
              },
            }
          );
        });
      }
    });
});
//=================================Saving files to database=================================//

bot.on("message", async (ctx) => {
  if (
    ctx.message.forward_from &&
    ctx.message.forward_from.id == process.env.POST_BOT_ID
  ) {
    await db.getAUser(ctx.from.id).then(async (user) => {
      if (user.admin || ctx.from.id == process.env.ADMIN) {
        let post = {};
        // Categorizing post type

        if (ctx.message.photo) {
          //if post is photo
          post.type = "photo";
          post.file_id =
            ctx.message.photo[ctx.message.photo.length - 1].file_id;
          {
            ctx.message.caption ? (post.caption = ctx.message.caption) : "";
          }
          {
            ctx.message.reply_markup
              ? (post.reply_markup = ctx.message.reply_markup)
              : "";
          }
        } else if (ctx.message.animation) {
          //if post is animation /gif
          post.type = "animation";
          post.file_id = ctx.message.animation.file_id;
          {
            ctx.message.caption ? (post.caption = ctx.message.caption) : "";
          }
          {
            ctx.message.reply_markup
              ? (post.reply_markup = ctx.message.reply_markup)
              : "";
          }
        } else if (ctx.message.video) {
          //if post is video
          post.type = "video";
          post.file_id = ctx.message.video.file_id;
          {
            ctx.message.caption ? (post.caption = ctx.message.caption) : "";
          }
          {
            ctx.message.reply_markup
              ? (post.reply_markup = ctx.message.reply_markup)
              : "";
          }
        } else if (ctx.message.document) {
          post.type = "document";
          post.file_id = ctx.message.document.file_id;
          {
            ctx.message.caption ? (post.caption = ctx.message.caption) : "";
          }
          {
            ctx.message.reply_markup
              ? (post.reply_markup = ctx.message.reply_markup)
              : "";
          }
        } else if (ctx.message.text) {
          post.type = "text";
          post.text = ctx.message.text;
          {
            ctx.message.reply_markup
              ? (post.reply_markup = ctx.message.reply_markup)
              : "";
          }
        }

        await db.getBroadcastPost().then((res) => {
          if (res.length < 1) {
            post.id = 1;
            db.savePost(post).then((r) => {
              if (r) {
                ctx.reply(`<b>PostId:</b> <code>${r.id ?? 1}</code>`, {
                  parse_mode: "HTML",
                });
              } else {
                ctx.reply(`☣ Something went wrong`);
              }
            });
          } else {
            let lastid = parseInt(res[res.length - 1].id);
            post.id = lastid + 1;
            db.savePost(post).then((r) => {
              if (r) {
                ctx.reply(`<b>PostId:</b> <code>${post.id}</code>`, {
                  parse_mode: "HTML",
                });
              } else {
                ctx.reply(`☣ Something went wrong`);
              }
            });
          }
        });
      } else {
        ctx.reply("☢ Authorization failed");
      }
    });
  } else {
    //handling files
    let fileDetails = {
      file_name: "",
      userId: ctx.from.id,
      file_id: "",
      uniqueId: "",
      caption: ctx.message.caption ?? "",
      reply_markup: ctx.message.reply_markup ?? "",
      shortid: shortid.generate(),
      file_size: "",
      type: "",
    };
    if (ctx.message.photo) {
      fileDetails.file_id = ctx.message.photo[0].file_id;
      fileDetails.uniqueId = ctx.message.photo[0].file_unique_id;
      fileDetails.file_size = ctx.message.photo[0].file_size;
      fileDetails.type = "photo";

      //Forwarding files to log channel for bot admin inspection
      ctx.replyWithPhoto(fileDetails.file_id, {
        chat_id: process.env.LOG_CHANNEL,
        caption: `${fileDetails.caption}\n\n\n🆔: <code>${ctx.from.id}</code> \n👤: <code>${ctx.from.first_name}</code> \n🆔: <code>${fileDetails.shortid} </code>\n`,
        parse_mode: "HTML",
        reply_markup: fileDetails.reply_markup ?? null,
      });
    } else if (ctx.message.animation) {
      fileDetails.file_name = ctx.message.animation.file_name;
      fileDetails.file_id = ctx.message.animation.file_id;
      fileDetails.uniqueId = ctx.message.animation.file_unique_id;
      fileDetails.file_size = ctx.message.animation.file_size;
      fileDetails.type = "animation";

      //Forwarding files to log channel for bot admin inspection
      ctx.replyWithAnimation(fileDetails.file_id, {
        chat_id: process.env.LOG_CHANNEL,
        caption: `${fileDetails.caption}\n\n\n🆔: <code>${ctx.from.id}</code> \n👤: <code>${ctx.from.first_name}</code> \n🆔: <code>${fileDetails.shortid} </code>\n`,
        parse_mode: "HTML",
        reply_markup: fileDetails.reply_markup ?? null,
      });
    } else if (ctx.message.document) {
      fileDetails.file_name = ctx.message.document.file_name;
      fileDetails.file_id = ctx.message.document.file_id;
      fileDetails.uniqueId = ctx.message.document.file_unique_id;
      fileDetails.file_size = ctx.message.document.file_size;
      fileDetails.type = "document";

      //Forwarding files to log channel for bot admin inspection
      ctx.replyWithDocument(fileDetails.file_id, {
        chat_id: process.env.LOG_CHANNEL,
        caption: `${fileDetails.caption}\n\n\n🆔: <code>${ctx.from.id}</code> \n👤: <code>${ctx.from.first_name}</code> \n🆔: <code>${fileDetails.shortid} </code>\n`,
        parse_mode: "HTML",
        reply_markup: fileDetails.reply_markup ?? null,
      });
    } else if (ctx.message.video) {
      fileDetails.file_name = ctx.message.video.file_name;
      fileDetails.file_id = ctx.message.video.file_id;
      fileDetails.uniqueId = ctx.message.video.file_unique_id;
      fileDetails.file_size = ctx.message.video.file_size;
      fileDetails.type = "video";

      //Forwarding files to log channel for bot admin inspection
      ctx.replyWithVideo(fileDetails.file_id, {
        chat_id: process.env.LOG_CHANNEL,
        caption: `${fileDetails.caption}\n\n\n🆔: <code>${ctx.from.id}</code> \n👤: <code>${ctx.from.first_name}</code> \n🆔: <code>${fileDetails.shortid} </code>\n`,
        parse_mode: "HTML",
        reply_markup: fileDetails.reply_markup ?? null,
      });
    } else if (ctx.message.audio) {
      fileDetails.file_name = ctx.message.audio.file_name;
      fileDetails.file_id = ctx.message.audio.file_id;
      fileDetails.uniqueId = ctx.message.audio.file_unique_id;
      fileDetails.file_size = ctx.message.audio.file_size;
      fileDetails.type = "audio";

      //Forwarding files to log channel for bot admin inspection
      ctx.replyWithAudio(fileDetails.file_id, {
        chat_id: process.env.LOG_CHANNEL,
        caption: `${fileDetails.caption}\n\n🆔: <code>${ctx.from.id}</code> \n👤: <code>${ctx.from.first_name}</code> \n🆔: <code>${fileDetails.shortid} </code>\n`,
        parse_mode: "HTML",
        reply_markup: fileDetails.reply_markup ?? null,
      });
    }

    //saving file details to database
    db.saveFile(fileDetails);

    //Sharing public link for saved files
    ctx.reply(
      `https://telegram.me/${process.env.BOTUSERNAME}?start=${fileDetails.shortid}`
    );
  }
});

//=================================bot config=================================//

bot.launch({
  webhook: {
    domain: `${process.env.DOMAIN}.herokuapp.com`,
    port: Number(process.env.PORT),
  },
});

// bot.launch();
