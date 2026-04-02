namespace InControl.NativeProfile
{
	public class PDPMarvelControllerMacProfile : Xbox360DriverMacProfile
	{
		public PDPMarvelControllerMacProfile()
		{
			base.Name = "PDP Marvel Controller";
			base.Meta = "PDP Marvel Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3695,
					ProductID = (ushort)327
				}
			};
		}
	}
}
