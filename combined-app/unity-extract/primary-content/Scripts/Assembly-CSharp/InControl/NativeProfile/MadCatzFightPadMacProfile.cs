namespace InControl.NativeProfile
{
	public class MadCatzFightPadMacProfile : Xbox360DriverMacProfile
	{
		public MadCatzFightPadMacProfile()
		{
			base.Name = "Mad Catz FightPad";
			base.Meta = "Mad Catz FightPad on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)61486
				}
			};
		}
	}
}
