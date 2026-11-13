using System;
using Autodesk.Revit.Attributes;
using Autodesk.Revit.DB;
using Autodesk.Revit.UI;

namespace Starter
{
    [Transaction(TransactionMode.Manual)]
    public class Command : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            try
            {
                var uidoc = commandData.Application.ActiveUIDocument;
                var doc = uidoc.Document;
                var selected = uidoc.Selection.GetElementIds();

                using (var tx = new Transaction(doc, "Starter"))
                {
                    tx.Start();
                    // The order's model changes go here. Read-only tools can drop the transaction.
                    tx.Commit();
                }

                TaskDialog.Show("Starter", selected.Count + " element(s) selected in " + doc.Title);
                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                message = ex.ToString();
                return Result.Failed; // Revit rolls back and shows the message
            }
        }
    }
}
