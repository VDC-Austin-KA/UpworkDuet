using System;
using System.Windows.Forms;
using Autodesk.Navisworks.Api.Plugins;
using NavApp = Autodesk.Navisworks.Api.Application;

namespace Starter
{
    // The first argument is the plug-in id: change it per order, it must be unique in Navisworks.
    [Plugin("Starter", "ACLP_VDC", DisplayName = "Starter", ToolTip = "What this does, in one line")]
    [AddInPlugin(AddInLocation.AddIn)]
    public class Plugin : AddInPlugin
    {
        public override int Execute(params string[] parameters)
        {
            try
            {
                var doc = NavApp.ActiveDocument;
                var selected = doc.CurrentSelection.SelectedItems;

                // The order's work goes here.
                MessageBox.Show(selected.Count + " item(s) selected in " + doc.Title, "Starter");
                return 0;
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString(), "Starter error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
        }
    }
}
