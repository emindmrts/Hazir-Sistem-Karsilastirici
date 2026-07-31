import express from "express";
const router = express.Router();
import { promises as fs } from "fs";
import mysql from "mysql2/promise"; // mysql2 paketini kullanıyoruz
import dbConfig from "../config.mjs";

router.get("/", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    // GPU listesini veritabanından sorgulama
    const [CPUs] = await connection.execute("Select * from `CPU`");

    // Veritabanı bağlantısını kapatma
    await connection.end();

    const productList = JSON.parse(await fs.readFile("mock.json", "utf-8"));

    const filteredCPUList = CPUs.filter((cpu) => {
      // Check if there is at least one product that matches the CPU criteria
      return productList.some((item) => {
        const itemCPU = item.specs?.CPU?.toLowerCase() || "";

        return (itemCPU + " ").includes(cpu.value.trim().toLowerCase());
      });
    });

    // Return the filtered CPU list
    res.json(filteredCPUList);
  } catch (error) {
    console.error("Error reading or processing the file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
