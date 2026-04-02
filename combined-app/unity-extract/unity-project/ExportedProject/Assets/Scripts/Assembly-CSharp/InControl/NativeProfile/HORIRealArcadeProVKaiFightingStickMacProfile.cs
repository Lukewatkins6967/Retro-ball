namespace InControl.NativeProfile
{
	public class HORIRealArcadeProVKaiFightingStickMacProfile : Xbox360DriverMacProfile
	{
		public HORIRealArcadeProVKaiFightingStickMacProfile()
		{
			base.Name = "HORI Real Arcade Pro V Kai Fighting Stick";
			base.Meta = "HORI Real Arcade Pro V Kai Fighting Stick on Mac";
			Matchers = new NativeInputDeviceMatcher[2]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21774
				},
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)3853,
					ProductID = (ushort)120
				}
			};
		}
	}
}
