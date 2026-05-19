import { Router } from "express";
import getCPUs from "../filter-data/cpus.mjs";
import getGPUs from "../filter-data/gpus.mjs";
import getProductsRouter from "./getProducts.mjs";

const router = Router();

router.use("/cpu", getCPUs);
router.use("/gpu", getGPUs);
router.use("/getProducts", getProductsRouter);

export default router;
