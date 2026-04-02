namespace InControl.NativeProfile
{
	public class HORIRealArcadeProVXMacProfile : Xbox360DriverMacProfile
	{
		public HORIRealArcadeProVXMacProfile()
		{
			base.Name = "HORI Real Arcade Pro VX";
			base.Meta = "HORI Real Arcade Pro VX on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3853,
					ProductID = (ushort)27
				}
			};
		}
	}
}
