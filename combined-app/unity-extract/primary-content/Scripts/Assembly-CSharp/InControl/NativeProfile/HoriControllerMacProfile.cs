namespace InControl.NativeProfile
{
	public class HoriControllerMacProfile : Xbox360DriverMacProfile
	{
		public HoriControllerMacProfile()
		{
			base.Name = "Hori Controller";
			base.Meta = "Hori Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)21760
				}
			};
		}
	}
}
