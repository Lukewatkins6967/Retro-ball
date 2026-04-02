namespace InControl.NativeProfile
{
	public class PDPTronControllerMacProfile : Xbox360DriverMacProfile
	{
		public PDPTronControllerMacProfile()
		{
			base.Name = "PDP Tron Controller";
			base.Meta = "PDP Tron Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)63747
				}
			};
		}
	}
}
