namespace InControl.NativeProfile
{
	public class HoriRealArcadeProEXMacProfile : Xbox360DriverMacProfile
	{
		public HoriRealArcadeProEXMacProfile()
		{
			base.Name = "Hori Real Arcade Pro EX";
			base.Meta = "Hori Real Arcade Pro EX on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)62724
				}
			};
		}
	}
}
