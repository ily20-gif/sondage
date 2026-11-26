import { DataTypes } from "sequelize";
import sequelize from "../lib/sequelize.js";

const Chat = sequelize.define("Chat", {
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  poll_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
});

export default Chat;
