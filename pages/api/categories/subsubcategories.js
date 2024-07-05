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
          subsubCategoryId: random,
          icon: data.field.icon || "",
          name: data.field.name.trim(),
          slug: convertToSlug(data.field.name, false),
        };
        console.log(objectData)

        await categoryModel.findByIdAndUpdate(
          data.field.categoryId, // Assuming categoryId is the ID of the category you want to update
          {
            $push: { "subCategories.$[elem].subsubCategories": objectData }
          },
          {
            arrayFilters: [{ "elem.subCategoryId": data.field.subCategoryId }] // Using arrayFilters to match the specific subCategory
          }
        );

        res.status(200).json({ success: true });
      } catch (err) {
        console.log(err);
        res.status(400).json({ success: false });
      }

      break;

    case "DELETE":
      try {
        const { categoryId, subCategoryId, subsubCategoryId } = req.query;

        // Example of deleting subsubCategory based on provided IDs
        const updatedCategory = await categoryModel.findOneAndUpdate(
          {
            _id: categoryId,
            "subCategories.subCategoryId": subCategoryId
          },
          {
            $pull: {
              "subCategories.$.subsubCategories.$[subsubElem]": { subsubCategoryId },
            },
          },
          {
            new: true,
            arrayFilters: [{ "subsubElem.subCategoryId": subCategoryId }],
          }
        );

        if (!updatedCategory) {
          return res.status(404).json({ success: false, message: "Category not found or delete failed." });
        }

        res.status(200).json({ success: true, updatedCategory });
      } catch (err) {
        console.error("Error deleting subsubCategory:", err);
        res.status(400).json({ success: false, message: err.message });
      }
      break;


    case "PUT":
      try {
        const data = await parseForm(req);
        const { categoryId, subCategoryId, subsubCategoryId, name, slug } = data.field;

        // Example of updating subsubCategory based on provided fields
        const updatedCategory = await categoryModel.findOneAndUpdate(
          {
            _id: categoryId,
            "subCategories.subCategoryId": subCategoryId,
            "subCategories.subsubCategories.subsubCategoryId": subsubCategoryId
          },
          {
            $set: {
              "subCategories.$[subElem].subsubCategories.$[subsubElem].name": name,
              "subCategories.$[subElem].subsubCategories.$[subsubElem].slug": slug ? slug : convertToSlug(name, false),
            },
          },
          {
            new: true,
            arrayFilters: [
              { "subElem.subCategoryId": subCategoryId },
              { "subsubElem.subsubCategoryId": subsubCategoryId }
            ],
          }
        );

        if (!updatedCategory) {
          return res.status(404).json({ success: false, message: "Category not found or update failed." });
        }

        res.status(200).json({ success: true, updatedCategory });
      } catch (err) {
        console.error("Error updating subsubCategory:", err);
        res.status(400).json({ success: false, message: err.message });
      }
      break;


    default:
      res.status(400).json({ success: false });
      break;
  }
}
