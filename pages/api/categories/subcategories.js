import sessionChecker from "~/lib/sessionPermission";
import customId from "custom-id-new";
import { convertToSlug } from "../../../middleware/functions";
import categoryModel from "../../../models/category";
import dbConnect from "../../../utils/dbConnect";
import { parseForm } from "../../../utils/parseForm";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function apiHandler(req, res) {
  const { method } = req;
  if (!(await sessionChecker(req, "category")))
    return res
      .status(403)
      .json({ success: false, message: "Access Forbidden" });

  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const data = await categoryModel.find({});
        res.status(200).json({ success: true, category: data });
      } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
      }
      break;

    case "POST":
      try {
        const data = await parseForm(req);
        const random = customId({ randomLength: 2, lowerCase: true });
        const objectData = { 
          subCategoryId: random,
          icon: data.field.icon,
          name: data.field.name.trim(),
          slug: convertToSlug(data.field.name, false),
        };
        await categoryModel.findByIdAndUpdate(data.field.categoryId, {
          $push: { subCategories: objectData },
        });
        res.status(200).json({ success: true });
      } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
      }
      break;

    case "DELETE":
      try {
        const id = req.query.id;
        const slug = req.query.slug;
        await categoryModel.findByIdAndUpdate(id, {
          $pull: { subCategories: { slug: slug } },
        });
        res.status(200).json({ success: true });
      } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
      }
      break;

    case "PUT":
      try {
        const data = await parseForm(req);
        const body = JSON.parse(data.field.data);
        await categoryModel.findOneAndUpdate(
          { _id: body.id, "subCategories.name": body.name },
          {
            $set: { "subCategories.$": { name: body.update, slug: body.slug } },
          }
        );
        res.status(200).json({ success: true });
      } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
      }
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}
