import sequelizer from "../../db/index.js";
import { DataTypes } from "sequelize";

const Withdraw = sequelizer.define("withdraw", {
    validator: {
        type: DataTypes.STRING,
    },
    source: {
        type: DataTypes.STRING,
    },
});

export default Withdraw;
