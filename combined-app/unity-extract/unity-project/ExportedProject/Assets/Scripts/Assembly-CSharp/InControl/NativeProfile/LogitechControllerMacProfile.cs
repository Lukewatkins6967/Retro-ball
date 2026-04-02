namespace InControl.NativeProfile
{
	public class LogitechControllerMacProfile : Xbox360DriverMacProfile
	{
		public LogitechControllerMacProfile()
		{
			base.Name = "Logitech Controller";
			base.Meta = "Logitech Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1133,
					ProductID = (ushort)62209
				}
			};
		}
	}
}
