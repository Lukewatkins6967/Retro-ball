namespace InControl.NativeProfile
{
	public class HoriEX2ControllerMacProfile : Xbox360DriverMacProfile
	{
		public HoriEX2ControllerMacProfile()
		{
			base.Name = "Hori EX2 Controller";
			base.Meta = "Hori EX2 Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[3]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3853,
					ProductID = (ushort)13
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)62721
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21760
				}
			};
		}
	}
}
