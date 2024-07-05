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

  // Uncomment if session checking is required
  if (!(await sessionChecker(req, "category")))
    return res.status(403).json({ success: false, message: "Access Forbidden" });

  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const data = await categoryModel.find({});
        res.status(200).json({ success: true, category: data });
      } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(400).json({ success: false });
      }
      break;

    case "POST":
      try {
        const data = await parseForm(req);
        const random = customId({ randomLength: 2, lowerCase: true });
        const objectData = {
          subsubsubCategoryId: random,
          icon: data.field.icon || "",
          name: data.field.name.trim(),
          slug: convertToSlug(data.field.name, false),
        };

        await categoryModel.findByIdAndUpdate(
          data.field.categoryId,
          {
            $push: {
              "subCategories.$[subElem].subsubCategories.$[subsubElem].subsubsubCategories": objectData,
            },
          },
          {
            arrayFilters: [
              { "subElem.subCategoryId": data.field.subCategoryId },
              { "subsubElem.subsubCategoryId": data.field.subsubCategoryId },
            ],
          }
        );

        res.status(200).json({ success: true });
      } catch (err) {
        console.error("Error creating subsubsubCategory:", err);
        res.status(400).json({ success: false });
      }
      break;

    case "DELETE":
      try {
        const { categoryId, subCategoryId, subsubCategoryId, subsubsubCategoryId } = req.query;

        // Example of deleting subsubsubCategory based on provided IDs
        const updatedCategory = await categoryModel.findOneAndUpdate(
          {
            _id: categoryId,
            "subCategories.subCategoryId": subCategoryId,
            "subCategories.subsubCategories.subsubCategoryId": subsubCategoryId,
          },
          {
            $pull: {
              "subCategories.$.subsubCategories.$[subsubElem].subsubsubCategories": { subsubsubCategoryId },
            },
          },
          {
            new: true,
            arrayFilters: [{ "subsubElem.subsubCategoryId": subsubCategoryId }],
          }
        );

        if (!updatedCategory) {
          return res.status(404).json({ success: false, message: "Category not found or delete failed." });
        }

        res.status(200).json({ success: true, updatedCategory });
      } catch (err) {
        console.error("Error deleting subsubsubCategory:", err);
        res.status(400).json({ success: false, message: err.message });
      }
      break;

    case "PUT":
      try {
        const data = await parseForm(req);
        const { categoryId, subCategoryId, subsubCategoryId, subsubsubCategoryId, name, slug } = data.field;

        // Example of updating subsubsubCategory based on provided fields
        const updatedCategory = await categoryModel.findOneAndUpdate(
          {
            _id: categoryId,
            "subCategories.subCategoryId": subCategoryId,
            "subCategories.subsubCategories.subsubCategoryId": subsubCategoryId,
            "subCategories.subsubCategories.subsubsubCategories.subsubsubCategoryId": subsubsubCategoryId,
          },
          {
            $set: {
              "subCategories.$[subElem].subsubCategories.$[subsubElem].subsubsubCategories.$[subsubsubElem].name": name,
              "subCategories.$[subElem].subsubCategories.$[subsubElem].subsubsubCategories.$[subsubsubElem].slug": slug ? slug : convertToSlug(name, false),
            },
          },
          {
            new: true,
            arrayFilters: [
              { "subElem.subCategoryId": subCategoryId },
              { "subsubElem.subsubCategoryId": subsubCategoryId },
              { "subsubsubElem.subsubsubCategoryId": subsubsubCategoryId },
            ],
          }
        );

        if (!updatedCategory) {
          return res.status(404).json({ success: false, message: "Category not found or update failed." });
        }

        res.status(200).json({ success: true, updatedCategory });
      } catch (err) {
        console.error("Error updating subsubsubCategory:", err);
        res.status(400).json({ success: false, message: err.message });
      }
      break;

    default:
      res.status(400).json({ success: false });
      break;
  }
}
