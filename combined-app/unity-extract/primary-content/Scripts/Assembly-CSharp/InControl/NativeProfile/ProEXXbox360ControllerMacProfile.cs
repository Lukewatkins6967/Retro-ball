namespace InControl.NativeProfile
{
	public class ProEXXbox360ControllerMacProfile : Xbox360DriverMacProfile
	{
		public ProEXXbox360ControllerMacProfile()
		{
			base.Name = "Pro EX Xbox 360 Controller";
			base.Meta = "Pro EX Xbox 360 Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21258
				}
			};
		}
	}
}
