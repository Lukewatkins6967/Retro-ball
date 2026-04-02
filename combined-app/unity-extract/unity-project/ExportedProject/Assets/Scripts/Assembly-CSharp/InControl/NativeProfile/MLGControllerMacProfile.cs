namespace InControl.NativeProfile
{
	public class MLGControllerMacProfile : Xbox360DriverMacProfile
	{
		public MLGControllerMacProfile()
		{
			base.Name = "MLG Controller";
			base.Meta = "MLG Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)61475
				}
			};
		}
	}
}
