namespace InControl.NativeProfile
{
	public class LogitechChillStreamControllerMacProfile : Xbox360DriverMacProfile
	{
		public LogitechChillStreamControllerMacProfile()
		{
			base.Name = "Logitech Chill Stream Controller";
			base.Meta = "Logitech Chill Stream Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1133,
					ProductID = (ushort)49730
				}
			};
		}
	}
}
