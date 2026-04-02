namespace InControl.NativeProfile
{
	public class PDPVersusControllerMacProfile : Xbox360DriverMacProfile
	{
		public PDPVersusControllerMacProfile()
		{
			base.Name = "PDP Versus Controller";
			base.Meta = "PDP Versus Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)63748
				}
			};
		}
	}
}
