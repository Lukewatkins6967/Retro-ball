namespace InControl.NativeProfile
{
	public class MadCatzFPSProMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzFPSProMacProfile()
		{
			base.Name = "Mad Catz FPS Pro";
			base.Meta = "Mad Catz FPS Pro on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)61479
				}
			};
		}
	}
}
