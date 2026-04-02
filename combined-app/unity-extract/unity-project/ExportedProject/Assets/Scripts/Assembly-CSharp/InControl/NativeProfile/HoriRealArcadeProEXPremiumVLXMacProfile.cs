namespace InControl.NativeProfile
{
	public class HoriRealArcadeProEXPremiumVLXMacProfile : Xbox360DriverMacProfile
	{
		public HoriRealArcadeProEXPremiumVLXMacProfile()
		{
			base.Name = "Hori Real Arcade Pro EX Premium VLX";
			base.Meta = "Hori Real Arcade Pro EX Premium VLX on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)62726
				}
			};
		}
	}
}
