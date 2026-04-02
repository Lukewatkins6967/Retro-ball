namespace InControl.NativeProfile
{
	public class RockBandGuitarMacProfile : Xbox360DriverMacProfile
	{
		public RockBandGuitarMacProfile()
		{
			base.Name = "Rock Band Guitar";
			base.Meta = "Rock Band Guitar on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)7085,
					ProductID = (ushort)2
				}
			};
		}
	}
}
