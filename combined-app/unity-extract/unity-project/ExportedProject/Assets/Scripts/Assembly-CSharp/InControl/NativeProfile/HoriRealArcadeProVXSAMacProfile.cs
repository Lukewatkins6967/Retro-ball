namespace InControl.NativeProfile
{
	public class HoriRealArcadeProVXSAMacProfile : Xbox360DriverMacProfile
	{
		public HoriRealArcadeProVXSAMacProfile()
		{
			base.Name = "Hori Real Arcade Pro VX SA";
			base.Meta = "Hori Real Arcade Pro VX SA on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)62722
				}
			};
		}
	}
}
