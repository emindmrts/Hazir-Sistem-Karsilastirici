import { Router } from "express";
import gameGarajRouter from "./gameGaraj.mjs";
import gamingGenRouter from "./gamingGen.mjs";
import itopyaRouter from "./itopya.mjs";
import pckolikRouter from "./pckolik.mjs";
import vatanRouter from "./vatan.mjs";
import sinerjiRouter from "./sinerji.mjs";
import tebilonRouter from "./tebilon.mjs";
import inceHesapRouter from "./inceHesap.mjs";
import getCPUs from "../filter-data/cpus.mjs";
import getGPUs from "../filter-data/gpus.mjs";
import getProductsRouter from "./getProducts.mjs";
import combinedRouter from "./combined.mjs";

import testRouter from "./test.mjs";

const router = Router();

router.use("/game-garaj", gameGarajRouter);
router.use("/gaming-gen", gamingGenRouter);
router.use("/itopya", itopyaRouter);
router.use("/pckolik", pckolikRouter);
router.use("/vatan", vatanRouter);
router.use("/sinerji", sinerjiRouter);
router.use("/tebilon", tebilonRouter);
router.use("/inceHesap", inceHesapRouter);
router.use("/test", testRouter);

router.use("/cpu", getCPUs);
router.use("/gpu", getGPUs);
router.use("/getProducts", getProductsRouter);
router.use("/combined", combinedRouter);

export default router;
