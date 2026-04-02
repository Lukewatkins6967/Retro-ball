namespace InControl.NativeProfile
{
	public class MVCTEStickMacProfile : Xbox360DriverMacProfile
	{
		public MVCTEStickMacProfile()
		{
			base.Name = "MVC TE Stick";
			base.Meta = "MVC TE Stick on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)61497
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)1848,
					ProductID = (ushort)46904
				}
			};
		}
	}
}
